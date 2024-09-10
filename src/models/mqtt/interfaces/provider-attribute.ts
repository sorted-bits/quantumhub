import { Attribute } from '../../module-loader/interfaces/attribute';
import { ModuleProvider } from '../../module-loader/models/module-provider';

export interface ProviderAttribute {
  provider: ModuleProvider;
  attribute: Attribute;
}
