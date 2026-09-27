# Economy and Betting System Plan

## Goal

Add a virtual-coin economy to the Discord bot. Coins have no real-world value and cannot be purchased or redeemed. Members can earn coins, steal coins from other members, transfer coins, and wager coins in staff-created prediction markets such as “Who wins: Lakers or Knicks?”

This document is the agreed design. The values under **Confirmed** were reviewed and approved; they can still be changed later by editing the constants in `services/economyService.js` and `services/betService.js`.

## Design Principles

- Persist balances, cooldowns, wagers, and market status in MongoDB so they survive restarts.
- Scope all economy data by Discord server (`guildId`) and member (`userId`).
- Keep coin-changing rules in a shared economy service, not duplicated in commands.
- Record every balance change in a ledger so balances and bet settlements can be audited.
- Use pari-mutuel pools: displayed odds are estimates based on member wagers, not externally supplied or guaranteed odds.
- Never allow a transfer, wager, refund, or payout to create coins accidentally through duplicate requests or concurrent commands.

## Member Commands

### `/balance [user]`

Show the caller's balance, or the selected member's balance if provided. This is a recommended companion command so members can check their coins before working, stealing, transferring, or wagering.

### `/work`

Award a random amount of coins within configurable minimum and maximum values. Enforce a persisted cooldown for each member in each server. Ignore bot accounts.

**Confirmed values:** reward range `100–250` coins, cooldown `1 hour`.

### `/steal user`

Attempt to take coins from another member. Block self-targets and bot accounts. Limit the amount stolen based on the target's current balance, and enforce a persisted cooldown per member/server.

On a failed attempt, either apply a fine or award nothing. Do not allow a target's balance to fall below zero. The exact odds, amount limits, cooldown, and failure penalty should be configurable or constants centralized in the economy service.

**Confirmed values:** `40%` success chance, steal `10–20%` of the target's balance with a minimum of `25` and a maximum of `500` coins, `2 hour` cooldown, failure fine of `10%` of the attempted amount capped at `100` coins. The fine is a coin sink, not a transfer to another member.

### `/transfer user amount`

Transfer a positive whole-number amount from the caller to another member. Block self-transfers, bot targets, invalid amounts, and insufficient funds. Debit and credit as one atomic operation. Start with no fee.

### General Member Rules

- Balances are non-negative whole numbers.
- Commands must check guild membership and use the interaction's `guildId` for all database queries.
- User-facing success and failure messages should be clear; private balance details can be ephemeral where appropriate.

## Staff Bet Commands

All market-management commands require the caller to have a role listed in the existing `MOD_ROLES` configuration.

### `/bet create`

Create a market with:

- A question/title, for example “Who wins: Lakers or Knicks?”
- Between two and five outcomes, for example `Lakers win` and `Knicks win` (optionally `Tie`).
- A closing time or duration.
- Optional description/rules to remove ambiguity about what counts as the result.

Validate non-empty, distinct outcome names and a closing time in the future. Give each market a unique, human-readable ID.

### `/bet list` and `/bet view id`

List open markets and show a market's status, outcomes, closing time, total pool, per-outcome pool, and current estimated odds. Past markets can be included through a status filter or history command later.

### `/bet wager id outcome amount`

A member chooses one outcome and stakes a positive whole-number amount. The stake is removed from their available wallet balance and recorded against the market. Reject wagers on closed, settled, or cancelled markets, wagers placed after the close time, insufficient balances, and invalid outcome selections.

**Confirmed v1 wager rule:** one selection per member per market. Members may add more coins to the same outcome before close, but cannot switch outcomes or hedge on another outcome. A unique `(guildId, betId, userId)` wager record enforces this rule.

### `/bet close id`

Allow staff to close a market early. Regardless of whether a staff command has run, the wager command must reject wagers once the stored closing time has passed. This avoids relying on an in-memory timer to enforce close times.

### `/bet resolve id outcome`

After the result is known, staff selects the winning outcome. Settle the market exactly once, pay winning wagers, and record who resolved it and when.

**Confirmed safeguard:** a market's creator cannot resolve their own market; another authorized staff member must resolve it.

### `/bet cancel id reason`

Cancel a market and refund every wager in full. Require a reason and record the staff member who cancelled it.

## Odds and Payout Model

Use a pari-mutuel pool. There is no promise of a fixed payout when a wager is placed; the final odds depend on all wagers when the market closes.

Let:

- `winningPool` = all stakes on the winning outcome.
- `losingPool` = all stakes on every other outcome combined.
- `feeRate` = the configurable fee taken from the losing pool.
- `stake` = one winning member's stake.

Confirmed fee: `5%` of the losing pool. The fee is a coin sink that helps limit inflation from `/work`.

Estimated/final gross payout multiplier:

`1 + losingPool * (1 - feeRate) / winningPool`

A winner receives their stake back plus their proportional share of the losing pool after the fee:

`payout = stake + stake / winningPool * losingPool * (1 - feeRate)`

Estimated profit is `payout - stake`. Before settlement, odds and profit are estimates and can change as members place wagers. At settlement, calculate from the final pools and pay in whole coins. Any rounding remainder is not paid out and remains a small coin sink.

Special cases:

- If there are no wagers on the selected winning outcome, cancel and refund all wagers; do not distribute the pool to nobody.
- If only one outcome received wagers, cancel/refund the market rather than charging members a fee on a pool with no opposing wagers.
- If a market is cancelled, refund all wagers without a fee.
- A settled or cancelled market cannot be resolved, cancelled, or paid again.

## MongoDB Data Model Proposal

### Wallet

Fields: `guildId`, `userId`, `balance`, `workAvailableAt`, `stealAvailableAt`, timestamps.

Indexes: unique `(guildId, userId)`.

### BetMarket

Fields: `guildId`, `marketId`, `creatorId`, `question`, `description/rules`, `outcomes`, `status`, `createdAt`, `closesAt`, `closedAt`, `resolvedAt`, `resolvedBy`, `winningOutcomeId`, `cancelledAt`, `cancelledBy`, `cancellationReason`, settlement metadata.

Statuses: `open`, `closed`, `settled`, `cancelled`.

Indexes: unique `(guildId, marketId)`; an index on `(guildId, status, closesAt)` for listing active markets.

### Wager

Fields: `guildId`, `marketId`, `userId`, `outcomeId`, `stake`, timestamps.

Indexes: unique `(guildId, marketId, userId)` for the proposed one-outcome-per-member rule; index by `(guildId, marketId, outcomeId)` for pool totals and settlement.

### EconomyLedger

Fields: `guildId`, `userId`, signed `amount`, transaction `type`, related user/market IDs where relevant, unique idempotency/reference key, `balanceAfter`, and timestamp.

Use explicit transaction types such as `work_reward`, `steal_gain`, `steal_loss`, `transfer_sent`, `transfer_received`, `bet_stake`, `bet_refund`, `bet_payout`, and `bet_fee`.

## Reliability and Security

- Use MongoDB transactions for multi-document changes (transfers, wager plus wallet debit, refunds, settlement, and ledger writes). The configured MongoDB deployment must support transactions; verify this before implementation.
- Use conditional atomic updates for wallet balance checks and cooldown claims so simultaneous requests cannot overspend or bypass a cooldown.
- Give each command operation a unique reference/idempotency key. Settlement must atomically claim an open/closed market before paying it.
- Do not accept a wager based on a stale market read: check market status and `closesAt` as part of the transaction.
- Keep wager and settlement writes in the same guild scope as the invoking command.
- Avoid relying on `setTimeout` for cooldowns, market closure, or payouts. Store timestamps and compare against the current time.
- Restrict market text and outcome labels to Discord-safe lengths, and avoid untrusted text that can trigger unwanted mentions.

## Implementation Layout Proposal

Follow the existing command-folder and Mongoose-model conventions:

- `commands/economy/`: `balance.js`, `work.js`, `steal.js`, `transfer.js`, and a `bet.js` command with subcommands.
- `models/`: wallet, bet-market, wager, and ledger schemas.
- `services/economyService.js`: balance changes, cooldown checks, transfer/steal/work operations, ledger writes.
- `services/betService.js`: market creation/validation, wager placement, pool totals, odds estimates, close, resolution, refunds.
- `utils/`: shared permission checks and formatting only if the existing code does not already have suitable helpers.

The existing startup command loader scans command folders and registers slash-command data, so economy commands should fit that pattern. Keep role authorization in the command/service boundary and check it on every staff market-management action.

## Testing Plan

### Economy

- First-use wallet creation and balance display.
- Work reward range and cooldown persistence.
- Steal success, failure, cooldown, self-target rejection, empty target, and balance floor.
- Transfer success, invalid amount, self-transfer, insufficient funds, and simultaneous transfers.
- Ensure each coin change creates exactly the expected ledger records.

### Betting

- Staff authorization and invalid market/outcome input.
- Wager accepted before close; rejected after close, on closed markets, or for insufficient funds.
- Same-outcome top-up works; changing/hedging outcome is rejected.
- Odds calculation with balanced and unbalanced pools, and with multiple outcomes.
- Correct winner payout, fee, and rounding behavior.
- No winning wagers and single-outcome-only pools refund correctly.
- Cancel refunds all members exactly once.
- Simultaneous wagers cannot overspend; repeated settlement cannot duplicate payouts.
- Every bet transaction and market status change is reflected in the ledger/audit fields.

## Confirmed Decisions

1. `/work`: reward range `100–250` coins, cooldown `1 hour`. Accepted as proposed.
2. `/steal`: `40%` success, `10–20%` of the target's balance (min `25`, max `500`), `2 hour` cooldown, failure fine of `10%` capped at `100`. Accepted as proposed.
3. Fee: `5%` of the losing pool on settlement. Kept as a coin sink.
4. Wagers: one selection per member per market, with top-ups allowed on that same outcome.
5. Market creators cannot resolve their own markets.
6. Markets support between `2` and `5` outcomes, so a `Tie` option is possible.
7. No channel restriction: economy and betting commands work in every channel of the server.
8. No limits in v1: no maximum bet, no cap on open markets, no cap on total pool. Only positive-integer and balance validation.
9. MongoDB transactions are in use. The deployment must be a replica set or sharded cluster; a standalone `mongod` is not supported. If it is not, every economy command answers with a clear configuration error instead of failing silently.

## Build Status

Steps 1 through 5 of the build sequence are implemented. Step 6 (history and quality-of-life features) is pending.

Implemented files:

- `models/walletSchema.js`, `models/economyLedgerSchema.js`, `models/betMarketSchema.js`, `models/wagerSchema.js`
- `services/economyService.js` (balance changes, cooldowns, work/steal/transfer, ledger writes)
- `services/betService.js` (market creation and validation, wagers, pool totals, odds, close, resolve, cancel, refunds)
- `utils/permissions.js` (`MOD_ROLES` check), `utils/format.js`, `utils/economyErrors.js`
- `commands/economy/balance.js`, `work.js`, `steal.js`, `transfer.js`, `bet.js`
- `events/interactionCreate.js` now dispatches autocomplete interactions

Deviation from the proposal: `bet_fee` ledger entries are written with a null `userId` and a null `balanceAfter`, because the fee leaves circulation instead of moving between wallets.

## Prefix Command Support

Every slash command also answers to a text prefix. `utils/interactionCompat.js` derives the option
list from each command's `SlashCommandBuilder`, converts the Discord option objects into plain
strings, and reuses the command's own `execute`, so there is a single implementation per command.

- `services/prefixService.js` keeps one prefix per guild in `models/prefixSchema.js` (unique on
  `guildId`) and falls back to `config.PREFIX` when a guild has no override.
- `events/messageCreate.js` resolves the prefix, parses the token, checks `isStaff` when the
  command is staff-only, routes the call, and returns the payload to `message.reply`.
- `index.js` attaches `executeMessage` to every command that does not define one.
- Accepted syntax: positional (`c!bet wager A1B2C3 o1 500`) and keyed (`monto=500`,
  `duracion:1h`). The last free-text option absorbs the remaining tokens, so
  `c!bet cancel A1B2C3 evento cancelado por error` keeps the whole reason. A repeated key keeps
  the first value.
- `commands/moderation/setprefix.js` requires staff, validates a maximum of 5 non-whitespace
  characters, and updates the cache immediately.
- `commands/utility/afk.js` moved to `services/afkService.js`, which caches the AFK state in
  memory and only queries Mongo on startup.

## Configuration Fixes

- `MONGO_URI` had no database in its path, so Mongoose fell back to the database `test`. The path
  is now `/calzbot`. The deployment is an Atlas replica set and supports transactions.
- `config.json` contained a JSON comment that made `require('./config.json')` throw. The comment
  was removed and the alternate application id was kept as `CLIENT_ID_ALT`.
- `models/prefixSchema.js` had no unique index on `guildId`; concurrent `/setprefix` calls could
  have created duplicate documents.
- `models/afkSchema.js` accepted an unbounded `reason`, which could exceed the Discord embed
  description limit. It is now capped at 300 characters, matching the command option.
- `models/betMarketSchema.js` only enforced the two-to-five outcome rule in the service. The
  schema now validates it too, so no invalid market can be stored.

## Verification

- 58 checks over configuration, module loading, command builders, prefix parsing, payout math
  (19,600 combinations), formatting and permissions.
- 44 checks over the prefix shim alone, including keyed parsing, free text, repeated keys and
  unknown options.
- A live smoke test against the real database confirmed the topology supports transactions,
  created every unique index, and validated the model validators.


## Suggested Build Sequence

1. Implement wallet and ledger models plus shared atomic balance operations.
2. Add `/balance`, `/work`, `/transfer`, and `/steal`; validate cooldown, concurrency, and accounting behavior.
3. Add market and wager models plus staff permission checks.
4. Add `/bet create`, `/bet list`, `/bet view`, and `/bet wager`; validate closing-time enforcement and odds display.
5. Add early close, settlement, cancellation, and refunds; test idempotency and payout accounting.
6. Add history and quality-of-life features after the core economy and settlement rules are stable.
