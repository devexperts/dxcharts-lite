# EventsComponent


|Method|Parameters|Returns|Description|
|---|---|---|---|
|`setEvents`|`events: EconomicEvent[]` |`void`|Sets the new event list.|
|`setVisible`|`visible: boolean` |`void`|Changes the component visibility.|
|`setEventTypeVisible`|`eventsVisibility: Partial<Record<EventType, boolean>>` |`void`|Changes visibility for the specific event type. For example, to turn off dividends visibility you can call this method with { dividends: false } argument|
|`observeEventHovered`||`Observable<EventWithId>`|Observes hovered event when mouse moves in, and provides null when mouse moves out.|
