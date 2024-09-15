import { Attribute } from '../../package-loader/interfaces/attribute';
import { PackageProvider } from '../../package-loader/models/package-provider';

export interface ProviderAttribute {
  provider: PackageProvider;
  attribute: Attribute;
}
