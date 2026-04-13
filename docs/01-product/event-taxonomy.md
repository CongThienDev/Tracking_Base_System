# Event Taxonomy

## Canonical standard events

### `page_view`

Triggered when a page is loaded and becomes viewable enough to count as a page session touchpoint.

### `view_content`

Triggered when a meaningful content object is displayed, such as a product detail page or specific offer asset.

### `add_to_cart`

Triggered when the user adds an item to a cart or equivalent purchase container.

### `initiate_checkout`

Triggered when the user enters a checkout funnel.

### `purchase`

Triggered when payment is accepted or the order is confirmed according to the business transaction boundary.

## Custom events

### `high_intent_user`

Represents strong behavioral purchase intent. Default trigger proposal:

- time on page > 60 seconds
- scroll depth > 70%
- visited pricing page

### `checkout_abandoned`

Triggered when a checkout was initiated but the purchase boundary was not reached within the configured timeout.

### `repeat_customer`

Triggered when a user with at least one prior purchase completes another qualifying purchase.

## Naming rules

- internal names use snake_case
- event names represent business meaning, not UI actions
- once public, event names are treated as contract-stable

## Required event categories for MVP

- browsing events
- commerce funnel events
- key custom intent events

## Related docs

- [Requirements](requirements.md)
- [Canonical event contract](../03-data/event-contract.md)
- [Platform mapping](../05-integrations/meta-capi.md)
