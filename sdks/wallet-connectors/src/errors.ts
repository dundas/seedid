export class ProviderNotFoundError extends Error {
  constructor(message = 'Provider not found') { super(message); this.name = 'ProviderNotFoundError'; }
}
export class ProviderMismatchError extends Error {
  constructor(message = 'Unexpected provider type') { super(message); this.name = 'ProviderMismatchError'; }
}
export class UserRejectedError extends Error {
  constructor(message = 'User rejected request') { super(message); this.name = 'UserRejectedError'; }
}
export class ValidationError extends Error {
  constructor(message = 'Invalid input') { super(message); this.name = 'ValidationError'; }
}
export class UnsupportedFeatureError extends Error {
  constructor(message = 'Unsupported feature') { super(message); this.name = 'UnsupportedFeatureError'; }
}
