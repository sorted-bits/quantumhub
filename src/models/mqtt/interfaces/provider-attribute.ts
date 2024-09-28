import { Attribute } from '../../package-loader/interfaces/attribute';
import { PackageProvider } from '../../package-provider/package-provider';

export interface ProviderAttribute {
  provider: PackageProvider;
  attribute: Attribute;
}
