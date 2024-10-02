import { Attribute, ClimateAttribute, Device, DeviceType, Provider } from 'quantumhub-sdk';

class ExampleClimate implements Device {
  /**
   * Provider instance, this will give you access to the QuantumHub API
   * and allows you to interact with the QuantumHub server.
   *
   * @private
   * @type {Provider}
   * @memberof TestDevice
   */
  private provider!: Provider;

  /**
   * Timeout ID for the update function.
   *
   * @private
   * @type {number}
   * @memberof TestDevice
   */
  private timeoutId: undefined | ReturnType<typeof setTimeout>;

  /**
   * This method is called when the packages are being loaded from disk and being cached by the QuantumHub server.
   * You will receive the Provider and Logger instances, which you can store in the class for later use.
   *
   * @param provider
   * @param logger
   * @returns
   */
  init = async (provider: Provider): Promise<boolean> => {
    this.provider = provider;

    return true;
  };

  /**
   * This method is called when the device is being started. This is always AFTER the init method.
   */
  start = async (): Promise<void> => {
    this.provider.logger.info('Starting ExampleClimate');

    /* For the example swich we set the state at start only */
    this.setClimateAttributes();
  };

  /**
   * This method is called when the device is being stopped. For example when the server is being stopped or the device
   * is manually stopped from the web interface (spoiler alert!).
   */
  stop = async (): Promise<void> => {
    this.provider.logger.info('Stopping TestDevice');

    if (this.timeoutId) {
      this.provider.timeout.clear(this.timeoutId);
      this.timeoutId = undefined;
    }
  };

  /**
   * This method is called when the device is being destroyed. This is always the last method that is called on the device.
   */
  destroy = async (): Promise<void> => {
    this.provider.logger.trace('Destroying TestDevice');
  };

  private fanMode = 'auto';
  private currentTemperature = 21.5;
  private targetTemperature = 21.5;
  private currentHumidity = 50;
  private targetHumidity = 50;
  private swingMode = 'off';
  private presetMode = 'home';
  private mode = 'off';
  private action = 'heating';

  setClimateAttributes = (): void => {
    // For this example there is only one attribute, which has the type climate.
    const attribute = this.provider.definition.attributes[0] as ClimateAttribute;

    // The attribute contains information about the supported features of the device.
    const { has_fanmode, has_swingmode, has_presetmode, has_humidity_control, has_mode_control, has_power_control } = attribute;

    // this.provider.setAttributeValue('action', this.action);
    this.provider.setAttributeValue('current_temperature', this.currentTemperature);
    this.provider.setAttributeValue('target_temperature', this.targetTemperature);
    this.provider.setAttributeValue('current_humidity', this.currentHumidity);

    this.provider.setAttributeValue('precision', 0.5);
    this.provider.setAttributeValue('min_temp', 1);
    this.provider.setAttributeValue('max_temp', 32);
    this.provider.setAttributeValue('temp_step', 0.5);

    // If the device supports fan mode, we set the fan mode to auto and the fan modes to ['auto', 'low', 'medium', 'high'].
    if (has_fanmode) {
      this.provider.setAttributeValue('fan_mode', this.fanMode);
      this.provider.setAttributeValue('fan_modes', ['auto', 'low', 'medium', 'high']);
    }

    // If the device supports swing mode, we set the swing mode to off and the swing modes to ['on', 'off'].
    if (has_swingmode) {
      this.provider.setAttributeValue('swing_mode', this.swingMode);
      this.provider.setAttributeValue('swing_modes', ['on', 'off']);
    }

    // If the device supports preset mode, we set the preset mode to home and the preset modes to ['eco', 'away', 'boost', 'comfort', 'home', 'sleep', 'activity'].
    if (has_presetmode) {
      this.provider.setAttributeValue('preset_mode', this.presetMode);
      this.provider.setAttributeValue('preset_modes', ['eco', 'away', 'boost', 'comfort', 'home', 'sleep', 'activity']);
    }

    // If the device supports humidity control, we set the humidity to 50 and the humidity range to 30-70.
    if (has_humidity_control) {
      this.provider.setAttributeValue('target_humidity', this.targetHumidity);
      this.provider.setAttributeValue('max_humidity', 70);
      this.provider.setAttributeValue('min_humidity', 30);
    }

    if (has_mode_control) {
      this.provider.setAttributeValue('mode', this.mode);
      this.provider.setAttributeValue('modes', ['auto', 'off', 'cool', 'heat', 'dry']);
    }
  };

  valueChanged = async (attribute: Attribute, value: any): Promise<void> => {
    this.provider.logger.trace(`Attribute ${attribute.name} changed to ${value}`);
  };

  onTargetTemperatureChanged = async (attribute: ClimateAttribute, value: number): Promise<void> => {
    this.provider.logger.trace(`Target temperature changed to ${value}`);

    this.targetTemperature = value;
    this.provider.setAttributeValue('target_temperature', this.targetTemperature);
  };

  onClimateFanModeChanged = async (attribute: ClimateAttribute, value: string): Promise<void> => {
    this.provider.logger.trace(`Fan mode changed to ${value}`);

    this.fanMode = value;
    this.provider.setAttributeValue('fan_mode', this.fanMode);
  };

  onClimateSwingModeChanged = async (attribute: ClimateAttribute, value: string): Promise<void> => {
    this.provider.logger.trace(`Swing mode changed to ${value}`);

    this.swingMode = value;
    this.provider.setAttributeValue('swing_mode', this.swingMode);
  };

  onClimatePresetModeChanged = async (attribute: ClimateAttribute, value: string): Promise<void> => {
    this.provider.logger.trace(`Preset mode changed to ${value}`);

    this.presetMode = value;
    this.provider.setAttributeValue('preset_mode', this.presetMode);
  };

  onTargetHumidityChanged = async (attribute: ClimateAttribute, value: number): Promise<void> => {
    this.provider.logger.trace(`Target humidity changed to ${value}`);

    this.targetHumidity = value;
    this.provider.setAttributeValue('target_humidity', this.targetHumidity);
  };
}

export default ExampleClimate;
