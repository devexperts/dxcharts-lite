# Colors

#### <!--CSB_LINK-->[Live Example](https://codesandbox.io/s/8jmdjr)<!--/CSB_LINK-->

# Economic events

dxChart is supporting different type of business-related events

Events are presented on X axis timeline, the supported events are:

-   earnings
-   dividends
-   splits
-   conference calls

# Events in Chart-Core

You can display different events on the chart using chart-core API.
There is a separate component `EventsComponent` available from `chartInstance`.

## Adding Events

Use `chartInstance.eventsComponent.setEvents` to set events to chart

```
const now = new Date();
chart.eventsComponent.setEvents([
	{
		type: 'earnings',
		timestamp: now.setHours(now.getHours() - 10),
		style: 'rhombus-large',
	},
	{
		type: 'dividends',
		timestamp: now.setHours(now.getHours() - 20),
		style: 'rhombus-small',
	},
	{
		type: 'conference-calls',
		timestamp: now.setHours(now.getHours() - 30),
		style: 'rhombus-small',
	},
	{
		type: 'splits',
		timestamp: now.setHours(now.getHours() - 50),
		style: 'rhombus',
	},
]);
```

## Visibility

Use `chartInstance.eventsComponent.setVisible` to change visibility
```
chartInstance.eventsComponent.setVisible(true);
```

## Interaction

You can subscribe to **hovering** by `chartInstance.eventsComponent.observeEventHovered` and start listening to hover events on "events"

```
let hoveredEvent: EventWithId | null = null;
chartInstance.eventsComponent.observeEventHovered().subscribe(event => {
	hoveredEvent = event;
});
```
