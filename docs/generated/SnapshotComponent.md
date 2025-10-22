# SnapshotComponent
Snapshot Component.
Allows to copy, download and share snapshot

|Method|Parameters|Returns|Description|
|---|---|---|---|
|`doActivate`||`void`|Implements doActivate method.|
|`createSnapshot`|`userDrawCallback: (ctx: CanvasRenderingContext2D) => void` - Optional callback function that takes a CanvasRenderingContext2D object as a parameter and allows the user to draw on the canvas before taking the snapshot.|`Promise<Blob>`|Creates a snapshot of the canvas and returns it as a Promise of Blob object.|
