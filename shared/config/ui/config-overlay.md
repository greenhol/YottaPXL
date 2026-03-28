# How to integrate

## webpack
Copy file `config-overlay.html` file to dist.
```
new CopyWebpackPlugin({
    patterns: [
        { from: 'path/to/ui/config-overlay.html', to: 'config-overlay.html' },
    ],
}),
```

## html
Add a container div to the main html file:
`<div id="your-id"></div>`

## typescript
Create an instance of `ConfigOverlay` providing the id to the container div in the main html. e.g.
```
this._configOverlay = new ConfigOverlay('your-id');
```

- Call `openOverlay` from your main logic to open the overlay.
- Closing the overlay is handled by the Overlay itself, but you can provide a list of Keys for keyboard handlers to close the overlay also.

Append your current Configuration via `setConfig(config: ModuleConfig<any>)`, you can switch the configuration whenever needed.

Only explicitly specified fields listed in `configUiSchema` are configurable via UI. Define them like so:
```
[
    new UiFieldInteger('testInteger', 'Test Integer', 'Description text (tooltip)', 3, 13),
    new UiFieldFloat('testFloat', 'Test Float', 'Description text (tooltip)', -3, 16),
    new UiFieldBool('testBool', 'Test Bool', 'Description text (tooltip)'),
],
```