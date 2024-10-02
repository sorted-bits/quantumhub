# Example QuantumHub package

This is an example package for [QuantumHub](https://github.com/sorted-bits/quantumhub). It uses all the features QuantumHub has to offer in a really basic way, to show how you could leverage QuantumHub together with Home Assistant and MQTT.

A package can be a NodeJS library, that uses Javascript or Typescript. Currently QuantumHub runs as a TypeScript application, so I would advise Typescript.

- [`package.json`](#packagejson)
- [`config.yaml`](#configyaml)
- [`entryfile.ts`](#entryfile)

<a name="packagejson"></a>
## package.json

In the [`package.json`](https://github.com/sorted-bits/test-device/blob/main/package.json) of this example package the only entry in `dependencies` we have is `quantumhub-sdk`.

```json
"dependencies": {
    "quantumhub-sdk": "1.0.3"
}
```

This SDK contains a couple of interfaces which allow you to develop for QuantumHub.

<a name="configyaml"></a>
## config.yaml

The [`config.yaml`](https://github.com/sorted-bits/test-device/blob/main/config.yaml) file is used to configure the test-device package for QuantumHub. This file defines the package's metadata and attributes, which include various sensors, switches, and automation triggers. Below is a detailed description of each section and its components:

### Module

```yaml
package:
  name: test-device
  version: 1.0.0
  description: QuantumHub package for testing the integration
  author: Wim Haanstra
  entry: test-device.ts
```

| Attribute | Description |
| --------- | ----------- |
| **`name`** | The name of the package, can only contain anything that is allowed in a package.json `name`. |
| **`version`** | The version of the package. |
| **`description`** | A brief description of the package, used later in some sort of repository. |
| **`author`** | The author of the package. |
| **`entry`** | The entry file for the package, which is a single Typescript/Javascript file. |

### Attributes

The attributes section defines various components that the package supports. Each attribute type has specific properties:

#### Sensor

Used for sending a simple value to Home Assistant, in this case a temperature.

```yaml
random_temperature:
  name: Random Temperature
  type: sensor
  unit_of_measurement: °C
  device_class: temperature
  state_class: measurement
```

| Attribute | Description |
| --------- | ----------- |
| **`key`** | The unique identifier used in QuantumHub and Home Assistant. This should be unique in your `config.yaml`. |
| **`name`** | The displayname of the attribute |
| **`type`** | `sensor` for this example. The type of the attribute, can be `sensor`, `switch` or `number` (more to come). |
| **`unit_of_measurement`** | Unit of measurement for this sensor |
| **`device_class`** | This determines the data that can go into this entity, check [`device-class.ts`](https://github.com/sorted-bits/quantumhub/blob/main/src/models/managers/package-manager/models/device-class.ts) for a full list of possibilities. |
| **`state_class`** | Check the [Home Assistant documentation](https://developers.home-assistant.io/docs/core/entity/sensor/#available-state-classes) for posibilties. |

#### Switch

This generates a switch in Home Assistant and as soon as it is toggled, the `valueChanged` method in your package will be triggered.

```yaml
toggle_sun:
  name: Toggle Sun
  type: switch
  optimistic: true
  on: ON
  off: OFF
```

| Attribute | Description |
| ---- | ------ |
| **`key`** | The unique identifier used in QuantumHub and Home Assistant. This should be unique in your `config.yaml`. |
| **`name`** | The displayname of the attribute. |
| **`type`** | `switch` for this example. The type of the attribute, can be `sensor`, `switch` or `number` (more to come) . |
| **`optimistic`** | When optimistic is being set, once a new value has been received through a command topic, it is validated and put into the state topic, without your package having to do anything for it. Your package still receives an event that this change happened. |
| **`on`** | The payload for the `on` state of a switch. This is what is written to MQTT, but also what the package receives as a value. |
| **`off`** | The payload for the `off` state of a switch. This is what is written to MQTT, but also what the package receives as a value |

#### Number

```yaml
sun_brightness:
  name: Sun Brightness
  type: number
  unit_of_measurement: lx
  step: 1
  min: 0
  max: 1000
```

| Attribute | Description |
| ---- | ------ |
| **`key`** | The unique identifier used in QuantumHub and Home Assistant. This should be unique in your `config.yaml`. |
| **`name`** | The displayname of the attribute. |
| **`type`** | `number` for this example. The type of the attribute, can be `sensor`, `switch` or `number` (more to come) . |
| **`unit_of_measurement`** | Unit of measurement for this sensor |
| **`step`** | The steps for the number slider used in Home Assistant. |
| **`min`** | The minimum value for this number. |
| **`max`** | The maximum value for this number. |

<a name="entryfile"></a>
## entryfile.ts

This is the main file for your package and this should inherit from the [`Device`](https://github.com/sorted-bits/quantumhub-sdk/blob/main/src/interfaces/device.ts) interface, defined in the SDK package.

```typescript
export interface Device {
  init(provider: Provider): Promise<boolean>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;

  valueChanged(attribute: string, value: any): Promise<void>;
  onMessage?(topic: string, message: Buffer): Promise<void>;
}
```

### init

The init method is being called, when your packages is being loaded and instantiated by the QuantumHub server. It provides this method with a so-called `Provider` which is your link to some of the base functionality. Check out the interface for [`Provider`](https://github.com/sorted-bits/quantumhub-sdk/blob/main/src/interfaces/provider.ts) here.

You probably want to store your provider somewhere in your class, as in this example.

```typescript
init = async (provider: Provider): Promise<boolean> => {
    this.provider = provider;

    return true;
  };
```

This method should return `true` when initialization was a success.