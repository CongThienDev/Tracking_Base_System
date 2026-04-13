# Glossary

## First-party tracking

An event collection model where our own service receives and stores events before any external platform does.

## Source of truth

The internal database record of an event. External marketing platforms are consumers, not authorities.

## Event

A single business or behavioral fact, such as `page_view` or `purchase`, represented by one canonical payload and one `event_id`.

## `event_id`

Global event identity used to deduplicate the same real-world event across frontend, API, storage, queue, and external platforms.

## Deduplication

The process of preventing one real-world event from being inserted or delivered more than once.

## Anonymous ID

A persistent pseudonymous browser identifier used before login.

## Session ID

An identifier representing a sequence of user actions within a bounded inactivity window.

## Downstream platform

An external destination that consumes already-stored events, such as Meta Conversions API, Google Ads, or TikTok Events API.
