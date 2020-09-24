export enum PrimitiveType {
	BOOLEAN = 'TYPE_BOOL',
	NUMBER = 'TYPE_UINT64',
	STRING = 'TYPE_STRING',
	BUFFER = 'TYPE_BYTES',
}
export function getTsPrimitive(type: PrimitiveType) {
	switch (type) {
		case PrimitiveType.BOOLEAN:
			return 'boolean';
		case PrimitiveType.NUMBER:
			return 'number';
		case PrimitiveType.STRING:
			return 'string';
		case PrimitiveType.BUFFER:
			return 'Buffer';
		default:
			return 'any';
	}
}
