# QuantumHub

## Purpose

The purpose of `QuantumHub` is to be able to easily develop support for hardware using the Home Assistant MQTT integration. By using NodeJS and simple examples, I try to make developing for Home Assistant more accessible.
This also makes sure that your code does not need to be merged into the Home Assistant repository, but can live in its own repository.

## Current limitations

- Only supports sensors and switches at the moment.
- Not able to mark a single device as offline.
- Manual configuration of units, etc.

## The basics

Your `module` needs to contain some basic information for `QuantumHub` to pick it up.

1. package.json
2. attributes.yaml
3. your entry file

### package.json

Your `package.json` can contain your normal `dependecies`, `devDependencies`, etc but you need to make sure that you supply at least the following attributes:

| Attribute     | Description                                                                            |
| ------------- | -------------------------------------------------------------------------------------- |
| `name`        | A unique module name, using anything that is allowed as package name.                  |
| `main`        | the entry file of your module. This needs to contain your class that extends `Device`. |
| `author`      | Your name, for some credits?                                                           |
| `description` | A clear description of what your module supports and does.                             |

Make sure you use the latest SDK package in your `dependencies`: [quantumhub-sdk](https://www.npmjs.com/package/quantumhub-sdk).

### attributes.yaml

The `attributes.yaml` file contains some metadata of the values you want to expose to Home Assistant. This makes sure Home Assistant can properly handle your data.

Here is an example for the [`test-device`](https://github.com/sorted-bits/test/blob/main/modules/test-device/attributes.yaml) included in this repository.

```yaml
time:
  name: Time
  type: sensor

random_temperature:
  name: Random Temperature
  type: sensor
  unit_of_measurement: °C
  device_class: temperature
  state_class: measurement

toggle_sun:
  name: Toggle Sun
  type: switch
  optimistic: true
  on: ON
  off: OFF
```

| Attribute           | Description                                                                                                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name                | The name used for the entity                                                                                                                                                                                                                             |
| type                | Currently only `sensor` is supported.                                                                                                                                                                                                                    |
| unit_of_measurement | The unit of measurement for your entity.                                                                                                                                                                                                                 |
| device_class        | This determines the data that can go into this entity, check [`device-class.ts`](https://github.com/sorted-bits/quantumhub/blob/main/src/models/managers/module-manager/models/device-class.ts) for a full list of possibilities.                        |
| state_class         | Check the [Home Assistant documentation](https://developers.home-assistant.io/docs/core/entity/sensor/#available-state-classes) for posibilties                                                                                                          |
| optimistic          | When optimistic is being set, once a new value has been received through a command topic, it is validated and put into the state topic, without your module having to do anything for it. Your module still receives an event that this change happened. |
| on                  | The payload for the `on` state of a switch                                                                                                                                                                                                               |
| off                 | The payload for the `off` state of a switch                                                                                                                                                                                                              |
