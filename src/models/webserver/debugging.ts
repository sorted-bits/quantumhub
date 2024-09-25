export const debugEventsForDeviceType = () => {
  const defaultMethods = [
    {
      name: 'generic',
      items: [
        {
          name: 'start',
          description: 'Start the device',
          deviceType: 'General',
          optional: false,
          parameters: [],
        },
        {
          name: 'stop',
          description: 'Calls the STOP method on the device, this is to test your stop method, but the system normally relies on an extra stop request to the state manager.',
          deviceType: 'General',
          optional: false,
          parameters: [],
        },
        {
          name: 'destroy',
          description: 'Destroy the device',
          deviceType: 'General',
          optional: false,
          parameters: [],
        },        
        {
          name: 'onMessage',
          description: 'This will call the onMessage function of the device, this method is optional and is triggered when the device manually subscribes to a MQTT topic.',
          deviceType: 'General',
          optional: true,
          parameters: [
            {
              name: 'topic',
              type: 'string',
              description: 'The topic of the message',
            },
            {
              name: 'message',
              type: 'string',
              description: 'The message',
            },
          ],
        },
        {
          name: 'valueChanged',
          description: 'Handle a value change',
          deviceType: 'General',
          optional: false,
          parameters: [
            {
              name: 'attribute',
              type: 'string',
              description: 'The attribute that changed',
            },
            {
              name: 'value',
              type: 'string',
              description: 'The value of the attribute',
            },
          ],
        },
      ],
    },
    {
      name: 'availability',
      items: [
        {
          name: 'setAvailable',
          description: 'This sets the availability of the device to true',
          deviceType: 'Availability',
          optional: true,
          parameters: []
        },
        {
          name: 'setUnavailable',
          description: 'Set the availability of the device to false',
          deviceType: 'Availability',
          optional: true,
          parameters: []
        },
      ]      
    },
    {
      name: 'button',
      items: [
        {
          name: 'onButtonPressed',
          description: 'Handle a button press',
          deviceType: 'Button',
          optional: true,
          parameters: [
            {
              name: 'attribute',
              type: 'button',
              description: 'The attribute that changed',
            },
          ],
        },
      ],
    },

    {
      name: 'select',
      items: [
        {
          name: 'onSelectChanged',
          description: 'Handle a select change',
          deviceType: 'Select',
          optional: true,
          parameters: [
            {
              name: 'attribute',
              type: 'select',
              description: 'The attribute that changed',
            },
            {
              name: 'value',
              type: 'string',
              description: 'The value of the attribute',
            },
          ],
        },
      ],
    },

    {
      name: 'number',
      items: [
        {
          name: 'onNumberChanged',
          description: 'Handle a number change',
          deviceType: 'Number',
          optional: true,
          parameters: [
            {
              name: 'attribute',
              type: 'number',
              description: 'The attribute that changed',
            },
            {
              name: 'value',
              type: 'string',
              description: 'The value of the attribute',
            },
          ],
        },
      ],
    },

    {
      name: 'switch',
      items: [
        {
          name: 'onSwitchChanged',
          description: 'Handle a switch change',
          deviceType: 'Switch',
          optional: true,
          parameters: [
            {
              name: 'attribute',
              type: 'switch',
              description: 'The attribute that changed',
            },
            {
              name: 'value',
              type: 'boolean',
              description: 'The value of the attribute',
            },
          ],
        },
      ],
    },

    {
      name: 'scene',
      items: [
        {
          name: 'onSceneTriggered',
          description: 'Handle a scene trigger',
          deviceType: 'Scene',
          optional: true,
          parameters: [
            {
              name: 'attribute',
              type: 'scene',
              description: 'The attribute that changed',
            },
          ],
        },
      ],
    },

    {
      name: 'climate',
      items: [
        {
          name: 'onHvacModeChanged',
          deviceType: 'Climate',
          description: 'Handle a HVAC mode change',
          optional: true,
          parameters: [
            {
              name: 'attribute',
              type: 'climate',
              description: 'The attribute that changed',
            },
            {
              name: 'value',
              type: 'string',
              description: 'The value of the attribute',
            },
          ],
        },
        {
          name: 'onClimateModeChanged',
          deviceType: 'Climate',
          description: 'Handle a climate mode change',
          optional: true,
          parameters: [
            {
              name: 'attribute',
              type: 'climate',
              description: 'The attribute that changed',
            },
            {
              name: 'value',
              type: 'string',
              description: 'The value of the attribute',
            },
          ],
        },
        {
          name: 'onClimatePresetModeChanged',
          deviceType: 'Climate',
          description: 'Handle a climate preset mode change',
          optional: true,
          parameters: [
            {
              name: 'attribute',
              type: 'climate',
              description: 'The attribute that changed',
            },
            {
              name: 'value',
              type: 'string',
              description: 'The value of the attribute',
            },
          ],
        },
        {
          name: 'onClimateFanModeChanged',
          deviceType: 'Climate',
          description: 'Handle a climate fan mode change',
          optional: true,
          parameters: [
            {
              name: 'attribute',
              type: 'climate',
              description: 'The attribute that changed',
            },
            {
              name: 'value',
              type: 'string',
              description: 'The value of the attribute',
            },
          ],
        },
        {
          name: 'onClimateSwingModeChanged',
          deviceType: 'Climate',
          description: 'Handle a climate swing mode change',
          optional: true,
          parameters: [
            {
              name: 'attribute',
              type: 'climate',
              description: 'The attribute that changed',
            },
            {
              name: 'value',
              type: 'string',
              description: 'The value of the attribute',
            },
          ],
        },
        {
          name: 'onPowerChanged',
          deviceType: 'Climate',
          description: 'Handle a power change',
          optional: true,
          parameters: [
            {
              name: 'attribute',
              type: 'climate',
              description: 'The attribute that changed',
            },
            {
              name: 'value',
              type: 'string',
              description: 'The value of the attribute',
            },
          ],
        },
        {
          name: 'onTargetTemperatureChanged',
          deviceType: 'Climate',
          description: 'Handle a target temperature change',
          optional: true,
          parameters: [
            {
              name: 'attribute',
              type: 'climate',
              description: 'The attribute that changed',
            },
            {
              name: 'value',
              type: 'string',
              description: 'The value of the attribute',
            },
          ],
        },
      ],
    },
  ];

  return defaultMethods;
};
