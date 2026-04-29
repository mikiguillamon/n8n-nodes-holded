import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { ApplicationError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const holdedApiBase = 'https://api.holded.com';

const listableResources = ['contact', 'product', 'service', 'document', 'payment', 'project', 'task', 'lead'];

const resourcesWithBody = [
	'contact',
	'product',
	'service',
	'document',
	'payment',
	'project',
	'task',
	'lead',
	'booking',
	'accountingAccount',
	'customApi',
];

const operationsWithBody = ['create', 'update', 'createTask', 'updateTask', 'request'];

const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	default: 'contact',
	options: [
		{
			name: 'Accounting Account',
			value: 'accountingAccount',
		},
		{
			name: 'Booking',
			value: 'booking',
		},
		{
			name: 'Contact',
			value: 'contact',
		},
		{
			name: 'Custom API Request',
			value: 'customApi',
		},
		{
			name: 'Document',
			value: 'document',
		},
		{
			name: 'Lead',
			value: 'lead',
		},
		{
			name: 'Payment',
			value: 'payment',
		},
		{
			name: 'Product',
			value: 'product',
		},
		{
			name: 'Project',
			value: 'project',
		},
		{
			name: 'Service',
			value: 'service',
		},
		{
			name: 'Task',
			value: 'task',
		},
	],
};

const idProperty = (
	name: string,
	displayName: string,
	resource: string,
	operations: string[],
	description: string,
): INodeProperties => ({
	displayName,
	name,
	type: 'string',
	required: true,
	default: '',
	description,
	displayOptions: {
		show: {
			resource: [resource],
			operation: operations,
		},
	},
});

const jsonProperty = (
	name: string,
	displayName: string,
	resources: string[],
	operations: string[],
	placeholder: string,
	description: string,
): INodeProperties => ({
	displayName,
	name,
	type: 'string',
	typeOptions: {
		rows: 8,
	},
	default: '',
	placeholder,
	description,
	displayOptions: {
		show: {
			resource: resources,
			operation: operations,
		},
	},
});

const simpleStringProperty = (
	name: string,
	displayName: string,
	resources: string[],
	operations: string[],
	description: string,
	placeholder = '',
): INodeProperties => ({
	displayName,
	name,
	type: 'string',
	default: '',
	description,
	placeholder,
	displayOptions: {
		show: {
			resource: resources,
			operation: operations,
		},
	},
});

const advancedJsonProperty = (
	name: string,
	displayName: string,
	resource: string,
	operations: string[],
	placeholder: string,
	description: string,
): INodeProperties =>
	jsonProperty(name, displayName, [resource], operations, placeholder, description);

const documentTypeProperty: INodeProperties = {
	displayName: 'Document Type',
	name: 'documentType',
	type: 'options',
	default: 'invoice',
	description: 'Commercial document type to manage in Holded',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['list', 'get', 'create', 'update', 'delete'],
		},
	},
	options: [
		{
			name: 'Credit Note',
			value: 'creditnote',
		},
		{
			name: 'Custom',
			value: 'custom',
		},
		{
			name: 'Estimate',
			value: 'estimate',
		},
		{
			name: 'Invoice',
			value: 'invoice',
		},
		{
			name: 'Proform',
			value: 'proform',
		},
		{
			name: 'Purchase',
			value: 'purchase',
		},
		{
			name: 'Purchase Order',
			value: 'purchaseorder',
		},
		{
			name: 'Purchase Refund',
			value: 'purchaserefund',
		},
		{
			name: 'Sales Order',
			value: 'salesorder',
		},
		{
			name: 'Sales Receipt',
			value: 'salesreceipt',
		},
		{
			name: 'Waybill',
			value: 'waybill',
		},
	],
};

const customDocumentTypeProperty: INodeProperties = {
	displayName: 'Custom Document Type',
	name: 'customDocumentType',
	type: 'string',
	default: '',
	placeholder: 'purchaserefund',
	description: 'Custom Holded document type segment when "Document Type" is set to "Custom"',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['list', 'get', 'create', 'update', 'delete'],
			documentType: ['custom'],
		},
	},
};

const customMethodProperty: INodeProperties = {
	displayName: 'HTTP Method',
	name: 'customMethod',
	type: 'options',
	default: 'GET',
	options: [
		{
			name: 'DELETE',
			value: 'DELETE',
		},
		{
			name: 'GET',
			value: 'GET',
		},
		{
			name: 'PATCH',
			value: 'PATCH',
		},
		{
			name: 'POST',
			value: 'POST',
		},
		{
			name: 'PUT',
			value: 'PUT',
		},
	],
	displayOptions: {
		show: {
			resource: ['customApi'],
			operation: ['request'],
		},
	},
	description: 'HTTP method to use',
};

const returnAllProperty: INodeProperties = {
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	default: true,
	description: 'Whether to return all results or only up to a given limit',
	displayOptions: {
		show: {
			resource: listableResources,
			operation: ['list'],
		},
	},
};

const limitProperty: INodeProperties = {
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	default: 50,
	typeOptions: {
		minValue: 1,
		maxValue: 1000,
	},
	description: 'Max number of results to return',
	displayOptions: {
		show: {
			resource: listableResources,
			operation: ['list'],
			returnAll: [false],
		},
	},
};

const useRequestPaginationProperty: INodeProperties = {
	displayName: 'Send Page Parameters',
	name: 'useRequestPagination',
	type: 'boolean',
	default: false,
	description: 'Whether to send page and limit query parameters to Holded. Enable only for endpoints that support them.',
	displayOptions: {
		show: {
			resource: listableResources,
			operation: ['list'],
		},
	},
};

const requestPaginationProperty: INodeProperties = {
	displayName: 'Request Pagination',
	name: 'requestPagination',
	type: 'collection',
	placeholder: 'Add Pagination Option',
	default: {},
	description: 'Pagination query parameters to send to Holded when the endpoint supports them',
	displayOptions: {
		show: {
			resource: listableResources,
			operation: ['list'],
			useRequestPagination: [true],
		},
	},
	options: [
		{
			displayName: 'Page',
			name: 'page',
			type: 'number',
			default: 1,
			typeOptions: {
				minValue: 1,
			},
			description: 'Page number to request from Holded',
		},
		{
			displayName: 'Items Per Page',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: {
				minValue: 1,
				maxValue: 1000,
			},
			description: 'Max number of results to return',
		},
	],
};

const filterCollectionProperty = (
	name: string,
	resources: string[],
	options: INodeProperties[],
): INodeProperties => ({
	displayName: 'Filters',
	name,
	type: 'collection',
	placeholder: 'Add Filter',
	default: {},
	displayOptions: {
		show: {
			resource: resources,
			operation: ['list'],
		},
	},
	options,
});

const additionalQueryParametersProperty: INodeProperties = {
	displayName: 'Additional Query Parameters',
	name: 'additionalQueryParameters',
	type: 'fixedCollection',
	placeholder: 'Add Parameter',
	default: {},
	typeOptions: {
		multipleValues: true,
	},
	description: 'Extra query string parameters not exposed as filters',
	displayOptions: {
		show: {
			resource: [...listableResources, 'customApi'],
			operation: ['list', 'request'],
		},
	},
	options: [
		{
			displayName: 'Parameter',
			name: 'parameters',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					description: 'Query string parameter name',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					description: 'Query string parameter value',
				},
			],
		},
	],
};

const bodyFieldsProperty: INodeProperties = {
	displayName: 'Fields',
	name: 'bodyFields',
	type: 'fixedCollection',
	placeholder: 'Add Field',
	default: {},
	typeOptions: {
		multipleValues: true,
	},
	description: 'Simple request body fields. Use Advanced Body JSON for nested structures such as document lines.',
	displayOptions: {
		show: {
			resource: resourcesWithBody,
			operation: operationsWithBody,
		},
	},
	options: [
		{
			displayName: 'Field',
			name: 'fields',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					description: 'Body field name',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					description: 'Body field value',
				},
			],
		},
	],
};

const contactOperationProperty: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	default: 'create',
	displayOptions: {
		show: {
			resource: ['contact'],
		},
	},
	options: [
		{ action: 'Create a contact', name: 'Create', value: 'create' },
		{ action: 'Delete a contact', name: 'Delete', value: 'delete' },
		{ action: 'Get a contact', name: 'Get', value: 'get' },
		{ action: 'Get many contacts', name: 'Get Many', value: 'list' },
		{ action: 'Update a contact', name: 'Update', value: 'update' },
	],
};

const productOperationProperty: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	default: 'create',
	displayOptions: {
		show: {
			resource: ['product'],
		},
	},
	options: [
		{ action: 'Create a product', name: 'Create', value: 'create' },
		{ action: 'Delete a product', name: 'Delete', value: 'delete' },
		{ action: 'Get a product', name: 'Get', value: 'get' },
		{ action: 'Get many products', name: 'Get Many', value: 'list' },
		{ action: 'Update a product', name: 'Update', value: 'update' },
	],
};

const serviceOperationProperty: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	default: 'create',
	displayOptions: {
		show: {
			resource: ['service'],
		},
	},
	options: [
		{ action: 'Create a service', name: 'Create', value: 'create' },
		{ action: 'Delete a service', name: 'Delete', value: 'delete' },
		{ action: 'Get a service', name: 'Get', value: 'get' },
		{ action: 'Get many services', name: 'Get Many', value: 'list' },
		{ action: 'Update a service', name: 'Update', value: 'update' },
	],
};

const documentOperationProperty: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	default: 'create',
	displayOptions: {
		show: {
			resource: ['document'],
		},
	},
	options: [
		{ action: 'Create a document', name: 'Create', value: 'create' },
		{ action: 'Delete a document', name: 'Delete', value: 'delete' },
		{ action: 'Get a document', name: 'Get', value: 'get' },
		{ action: 'Get many documents', name: 'Get Many', value: 'list' },
		{ action: 'Update a document', name: 'Update', value: 'update' },
	],
};

const paymentOperationProperty: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	default: 'create',
	displayOptions: {
		show: {
			resource: ['payment'],
		},
	},
	options: [
		{ action: 'Create a payment', name: 'Create', value: 'create' },
		{ action: 'Delete a payment', name: 'Delete', value: 'delete' },
		{ action: 'Get a payment', name: 'Get', value: 'get' },
		{ action: 'Get many payments', name: 'Get Many', value: 'list' },
		{ action: 'Update a payment', name: 'Update', value: 'update' },
	],
};

const projectOperationProperty: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	default: 'create',
	displayOptions: {
		show: {
			resource: ['project'],
		},
	},
	options: [
		{ action: 'Create a project', name: 'Create', value: 'create' },
		{ action: 'Delete a project', name: 'Delete', value: 'delete' },
		{ action: 'Get a project', name: 'Get', value: 'get' },
		{ action: 'Get many projects', name: 'Get Many', value: 'list' },
		{ action: 'Update a project', name: 'Update', value: 'update' },
	],
};

const taskOperationProperty: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	default: 'create',
	displayOptions: {
		show: {
			resource: ['task'],
		},
	},
	options: [
		{ action: 'Create a task', name: 'Create', value: 'create' },
		{ action: 'Delete a task', name: 'Delete', value: 'delete' },
		{ action: 'Get a task', name: 'Get', value: 'get' },
		{ action: 'Get many tasks', name: 'Get Many', value: 'list' },
		{ action: 'Update a task', name: 'Update', value: 'update' },
	],
};

const leadOperationProperty: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	default: 'create',
	displayOptions: {
		show: {
			resource: ['lead'],
		},
	},
	options: [
		{ action: 'Create a lead', name: 'Create', value: 'create' },
		{ action: 'Create a lead task', name: 'Create Task', value: 'createTask' },
		{ action: 'Delete a lead', name: 'Delete', value: 'delete' },
		{ action: 'Get a lead', name: 'Get', value: 'get' },
		{ action: 'Get many leads', name: 'Get Many', value: 'list' },
		{ action: 'Update a lead', name: 'Update', value: 'update' },
		{ action: 'Update a lead task', name: 'Update Task', value: 'updateTask' },
	],
};

const bookingOperationProperty: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	default: 'create',
	displayOptions: {
		show: {
			resource: ['booking'],
		},
	},
	options: [{ action: 'Create a booking', name: 'Create', value: 'create' }],
};

const accountingAccountOperationProperty: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	default: 'create',
	displayOptions: {
		show: {
			resource: ['accountingAccount'],
		},
	},
	options: [{ action: 'Create an accounting account', name: 'Create', value: 'create' }],
};

const customApiOperationProperty: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	default: 'request',
	displayOptions: {
		show: {
			resource: ['customApi'],
		},
	},
	options: [{ action: 'Send a custom API request', name: 'Send Request', value: 'request' }],
};

const documentContactIdProperty = simpleStringProperty(
	'documentContactId',
	'Contact ID',
	['document'],
	['create', 'update'],
	'Holded contact ID for the invoice or estimate recipient',
);

const documentContactCodeProperty = simpleStringProperty(
	'documentContactCode',
	'Contact Code',
	['document'],
	['create', 'update'],
	'NIF, CIF, VAT, or contact code. Used when Contact ID is empty.',
);

const documentContactNameProperty = simpleStringProperty(
	'documentContactName',
	'Contact Name',
	['document'],
	['create', 'update'],
	'Contact name. Holded can use it to create or match a contact when Contact ID and Contact Code are empty.',
);

const documentContactEmailProperty = simpleStringProperty(
	'documentContactEmail',
	'Contact Email',
	['document'],
	['create', 'update'],
	'Contact email for a new or matched contact',
	'name@email.com',
);

const documentContactAddressProperty = simpleStringProperty(
	'documentContactAddress',
	'Contact Address',
	['document'],
	['create', 'update'],
	'Billing address for a new or matched contact',
);

const documentContactCityProperty = simpleStringProperty(
	'documentContactCity',
	'Contact City',
	['document'],
	['create', 'update'],
	'Billing city for a new or matched contact',
);

const documentContactPostalCodeProperty = simpleStringProperty(
	'documentContactCp',
	'Contact Postal Code',
	['document'],
	['create', 'update'],
	'Billing postal code for a new or matched contact',
);

const documentContactProvinceProperty = simpleStringProperty(
	'documentContactProvince',
	'Contact Province',
	['document'],
	['create', 'update'],
	'Billing province for a new or matched contact',
);

const documentContactCountryCodeProperty = simpleStringProperty(
	'documentContactCountryCode',
	'Contact Country Code',
	['document'],
	['create', 'update'],
	'Billing country code for a new or matched contact, for example ES',
	'ES',
);

const documentApplyContactDefaultsProperty: INodeProperties = {
	displayName: 'Apply Contact Defaults',
	name: 'documentApplyContactDefaults',
	type: 'boolean',
	default: true,
	description: 'Whether Holded should apply the contact defaults to the document',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['create', 'update'],
		},
	},
};

const documentIssueDateProperty = simpleStringProperty(
	'documentIssueDate',
	'Issue Date',
	['document'],
	['create', 'update'],
	'Document issue date. Accepts YYYY-MM-DD, ISO date, Unix seconds, or milliseconds',
	'2025-01-01',
);

const documentDueDateProperty = simpleStringProperty(
	'documentDueDate',
	'Due Date',
	['document'],
	['create', 'update'],
	'Document due date. Accepts YYYY-MM-DD, ISO date, Unix seconds, or milliseconds',
	'2025-01-31',
);

const documentCurrencyProperty: INodeProperties = {
	displayName: 'Currency',
	name: 'documentCurrency',
	type: 'string',
	default: '',
	placeholder: 'EUR',
	description: 'Currency code for the document, for example EUR or USD',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['create', 'update'],
		},
	},
};

const documentNotesProperty = simpleStringProperty(
	'documentNotes',
	'Notes',
	['document'],
	['create', 'update'],
	'Internal or customer-facing notes for the document',
);

const documentDescriptionProperty = simpleStringProperty(
	'documentDescription',
	'Description',
	['document'],
	['create', 'update'],
	'Short description or concept for the document',
);

const documentLanguageProperty = simpleStringProperty(
	'documentLanguage',
	'Language',
	['document'],
	['create', 'update'],
	'Language code for the document, for example es or en',
	'es',
);

const documentNumberProperty = simpleStringProperty(
	'documentInvoiceNum',
	'Document Number',
	['document'],
	['create'],
	'Optional document number. Leave empty to let Holded assign it.',
);

const documentNumberingSeriesProperty = simpleStringProperty(
	'documentNumSerieId',
	'Numbering Series ID',
	['document'],
	['create'],
	'Holded numbering series ID to use for this document',
);

const documentPaymentMethodProperty = simpleStringProperty(
	'documentPaymentMethodId',
	'Payment Method ID',
	['document'],
	['create'],
	'Holded payment method ID for this document',
);

const documentSalesChannelProperty = simpleStringProperty(
	'documentSalesChannelId',
	'Sales Channel ID',
	['document'],
	['create', 'update'],
	'Holded sales channel ID for this document',
);

const documentDesignProperty = simpleStringProperty(
	'documentDesignId',
	'Design ID',
	['document'],
	['create'],
	'Holded design/template ID for this document',
);

const documentWarehouseProperty = simpleStringProperty(
	'documentWarehouseId',
	'Warehouse ID',
	['document'],
	['create', 'update'],
	'Warehouse ID for sales orders, purchase orders, or waybills',
);

const documentTagsProperty = simpleStringProperty(
	'documentTags',
	'Tags',
	['document'],
	['create', 'update'],
	'Comma-separated tags to assign to this document',
	'urgent, recurring',
);

const documentShippingAddressProperty = simpleStringProperty(
	'documentShippingAddress',
	'Shipping Address',
	['document'],
	['create', 'update'],
	'Shipping address for this document',
);

const documentShippingPostalCodeProperty = simpleStringProperty(
	'documentShippingPostalCode',
	'Shipping Postal Code',
	['document'],
	['create', 'update'],
	'Shipping postal code for this document',
);

const documentShippingCityProperty = simpleStringProperty(
	'documentShippingCity',
	'Shipping City',
	['document'],
	['create', 'update'],
	'Shipping city for this document',
);

const documentShippingProvinceProperty = simpleStringProperty(
	'documentShippingProvince',
	'Shipping Province',
	['document'],
	['create', 'update'],
	'Shipping province for this document',
);

const documentShippingCountryProperty = simpleStringProperty(
	'documentShippingCountry',
	'Shipping Country',
	['document'],
	['create', 'update'],
	'Shipping country for this document',
);

const documentApproveProperty: INodeProperties = {
	displayName: 'Approve Document',
	name: 'documentApprove',
	type: 'boolean',
	default: false,
	description: 'Whether Holded should approve the document immediately if the endpoint supports it',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['create', 'update'],
		},
	},
};

const documentItemsProperty: INodeProperties = {
	displayName: 'Line Items',
	name: 'documentItems',
	type: 'fixedCollection',
	placeholder: 'Add Line Item',
	default: {},
	typeOptions: {
		multipleValues: true,
	},
	description: 'Invoice or estimate lines. Add at least one line item when creating a commercial document.',
	displayOptions: {
		show: {
			resource: ['document'],
			operation: ['create', 'update'],
		},
	},
	options: [
		{
			displayName: 'Line Item',
			name: 'items',
			values: [
				{
					displayName: 'Description',
					name: 'desc',
					type: 'string',
					default: '',
					description: 'Optional line item description',
				},
				{
					displayName: 'Discount (%)',
					name: 'discount',
					type: 'number',
					default: 0,
					description: 'Discount percentage for this line item',
				},
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					description: 'Line item title',
				},
				{
					displayName: 'Product ID',
					name: 'productId',
					type: 'string',
					default: '',
					description: 'Optional Holded product ID for this line item',
				},
				{
					displayName: 'SKU',
					name: 'sku',
					type: 'string',
					default: '',
					description: 'Optional product or service reference',
				},
				{
					displayName: 'Tax (%)',
					name: 'tax',
					type: 'number',
					default: 21,
					description: 'Tax percentage for this line item',
				},
				{
					displayName: 'Unit Price',
					name: 'subtotal',
					type: 'number',
					default: 0,
					description: 'Unit price before tax',
				},
				{
					displayName: 'Units',
					name: 'units',
					type: 'number',
					default: 1,
					description: 'Quantity for this line item',
				},
			],
		},
	],
};

const contactFiltersProperty = filterCollectionProperty('contactFilters', ['contact'], [
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		placeholder: 'name@email.com',
		description: 'Filter by contact email',
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		description: 'Filter by contact phone',
	},
	{
		displayName: 'Mobile',
		name: 'mobile',
		type: 'string',
		default: '',
		description: 'Filter by contact mobile phone',
	},
	{
		displayName: 'Code',
		name: 'code',
		type: 'string',
		default: '',
		description: 'Filter by contact code',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'Filter by contact name',
	},
]);

const productFiltersProperty = filterCollectionProperty('productFilters', ['product'], [
	{
		displayName: 'SKU',
		name: 'sku',
		type: 'string',
		default: '',
		description: 'Filter by product SKU',
	},
	{
		displayName: 'Barcode',
		name: 'barcode',
		type: 'string',
		default: '',
		description: 'Filter by product barcode',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'Filter by product name',
	},
]);

const serviceFiltersProperty = filterCollectionProperty('serviceFilters', ['service'], [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'Filter by service name',
	},
]);

const documentFiltersProperty = filterCollectionProperty('documentFilters', ['document'], [
	{
		displayName: 'Contact ID',
		name: 'contactid',
		type: 'string',
		default: '',
		description: 'Filter by Holded contact ID',
	},
	{
		displayName: 'Start Timestamp',
		name: 'starttmp',
		type: 'string',
		default: '',
		placeholder: '1735689600 or 2025-01-01',
		description: 'Filter documents from this Unix timestamp. Accepts Unix seconds, milliseconds, or a date expression.',
	},
	{
		displayName: 'End Timestamp',
		name: 'endtmp',
		type: 'string',
		default: '',
		placeholder: '1767225599 or 2025-12-31',
		description: 'Filter documents until this Unix timestamp. Accepts Unix seconds, milliseconds, or a date expression.',
	},
	{
		displayName: 'Paid',
		name: 'paid',
		type: 'options',
		default: '1',
		description: 'Filter by paid status',
		options: [
			{
				name: 'Not Paid',
				value: '0',
			},
			{
				name: 'Paid',
				value: '1',
			},
			{
				name: 'Partially Paid',
				value: '2',
			},
		],
	},
	{
		displayName: 'Billed',
		name: 'billed',
		type: 'options',
		default: '1',
		description: 'Filter by billed status',
		options: [
			{
				name: 'Not Billed',
				value: '0',
			},
			{
				name: 'Billed',
				value: '1',
			},
		],
	},
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'options',
		default: 'created-desc',
		description: 'Sort documents by creation date',
		options: [
			{
				name: 'Created Ascending',
				value: 'created-asc',
			},
			{
				name: 'Created Descending',
				value: 'created-desc',
			},
		],
	},
]);

const paymentFiltersProperty = filterCollectionProperty('paymentFilters', ['payment'], [
	{
		displayName: 'Contact ID',
		name: 'contactid',
		type: 'string',
		default: '',
		description: 'Filter by Holded contact ID',
	},
	{
		displayName: 'Start Timestamp',
		name: 'starttmp',
		type: 'string',
		default: '',
		placeholder: '1735689600 or 2025-01-01',
		description: 'Filter payments from this Unix timestamp. Accepts Unix seconds, milliseconds, or a date expression.',
	},
	{
		displayName: 'End Timestamp',
		name: 'endtmp',
		type: 'string',
		default: '',
		placeholder: '1767225599 or 2025-12-31',
		description: 'Filter payments until this Unix timestamp. Accepts Unix seconds, milliseconds, or a date expression.',
	},
]);

const projectFiltersProperty = filterCollectionProperty('projectFilters', ['project'], [
	{
		displayName: 'Client ID',
		name: 'clientid',
		type: 'string',
		default: '',
		description: 'Filter by client/contact ID',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		default: '',
		description: 'Filter by project status',
	},
]);

const taskFiltersProperty = filterCollectionProperty('taskFilters', ['task'], [
	{
		displayName: 'Project ID',
		name: 'projectid',
		type: 'string',
		default: '',
		description: 'Filter by project ID',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		default: '',
		description: 'Filter by task status',
	},
]);

const leadFiltersProperty = filterCollectionProperty('leadFilters', ['lead'], [
	{
		displayName: 'Contact ID',
		name: 'contactid',
		type: 'string',
		default: '',
		description: 'Filter by contact ID',
	},
	{
		displayName: 'Stage ID',
		name: 'stageid',
		type: 'string',
		default: '',
		description: 'Filter by CRM stage ID',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		default: '',
		description: 'Filter by lead status',
	},
]);

const properties: INodeProperties[] = [
	resourceProperty,
	contactOperationProperty,
	productOperationProperty,
	serviceOperationProperty,
	documentOperationProperty,
	paymentOperationProperty,
	projectOperationProperty,
	taskOperationProperty,
	leadOperationProperty,
	bookingOperationProperty,
	accountingAccountOperationProperty,
	customApiOperationProperty,
	idProperty('contactId', 'Contact ID', 'contact', ['get', 'update', 'delete'], 'The Holded contact ID'),
	idProperty('productId', 'Product ID', 'product', ['get', 'update', 'delete'], 'The Holded product ID'),
	idProperty('serviceId', 'Service ID', 'service', ['get', 'update', 'delete'], 'The Holded service ID'),
	idProperty('paymentId', 'Payment ID', 'payment', ['get', 'update', 'delete'], 'The Holded payment ID'),
	idProperty('projectId', 'Project ID', 'project', ['get', 'update', 'delete'], 'The Holded project ID'),
	idProperty('taskId', 'Task ID', 'task', ['get', 'update', 'delete'], 'The Holded task ID'),
	idProperty('leadId', 'Lead ID', 'lead', ['get', 'update', 'delete', 'createTask', 'updateTask'], 'The Holded lead ID'),
	idProperty(
		'documentId',
		'Document ID',
		'document',
		['get', 'update', 'delete'],
		'The Holded document ID',
	),
	documentTypeProperty,
	customDocumentTypeProperty,
	customMethodProperty,
	documentContactIdProperty,
	documentContactCodeProperty,
	documentContactNameProperty,
	documentContactEmailProperty,
	documentContactAddressProperty,
	documentContactCityProperty,
	documentContactPostalCodeProperty,
	documentContactProvinceProperty,
	documentContactCountryCodeProperty,
	documentApplyContactDefaultsProperty,
	documentIssueDateProperty,
	documentDueDateProperty,
	documentCurrencyProperty,
	documentNotesProperty,
	documentDescriptionProperty,
	documentLanguageProperty,
	documentNumberProperty,
	documentNumberingSeriesProperty,
	documentPaymentMethodProperty,
	documentSalesChannelProperty,
	documentDesignProperty,
	documentWarehouseProperty,
	documentTagsProperty,
	documentShippingAddressProperty,
	documentShippingPostalCodeProperty,
	documentShippingCityProperty,
	documentShippingProvinceProperty,
	documentShippingCountryProperty,
	documentApproveProperty,
	documentItemsProperty,
	returnAllProperty,
	limitProperty,
	useRequestPaginationProperty,
	requestPaginationProperty,
	contactFiltersProperty,
	productFiltersProperty,
	serviceFiltersProperty,
	documentFiltersProperty,
	paymentFiltersProperty,
	projectFiltersProperty,
	taskFiltersProperty,
	leadFiltersProperty,
	additionalQueryParametersProperty,
	simpleStringProperty(
		'customPath',
		'Path',
		['customApi'],
		['request'],
		'Absolute Holded API path, beginning with /api/...',
		'/api/invoicing/v1/contacts',
	),
	advancedJsonProperty(
		'contactQueryJson',
		'Advanced Query JSON',
		'contact',
		['list'],
		'{\n  "phone": "+34999999999"\n}',
		'Optional query string parameters as a JSON object. Values here override filters and additional query parameters.',
	),
	advancedJsonProperty(
		'productQueryJson',
		'Advanced Query JSON',
		'product',
		['list'],
		'{\n  "sku": "REF-001"\n}',
		'Optional query string parameters as a JSON object. Values here override filters and additional query parameters.',
	),
	advancedJsonProperty(
		'serviceQueryJson',
		'Advanced Query JSON',
		'service',
		['list'],
		'{\n  "name": "Consulting"\n}',
		'Optional query string parameters as a JSON object. Values here override filters and additional query parameters.',
	),
	advancedJsonProperty(
		'documentQueryJson',
		'Advanced Query JSON',
		'document',
		['list'],
		'{\n  "contactid": "contact_id"\n}',
		'Optional query string parameters as a JSON object. Values here override filters and additional query parameters.',
	),
	advancedJsonProperty(
		'paymentQueryJson',
		'Advanced Query JSON',
		'payment',
		['list'],
		'{\n  "contactid": "contact_id"\n}',
		'Optional query string parameters as a JSON object. Values here override filters and additional query parameters.',
	),
	advancedJsonProperty(
		'projectQueryJson',
		'Advanced Query JSON',
		'project',
		['list'],
		'{\n  "status": "active"\n}',
		'Optional query string parameters as a JSON object. Values here override filters and additional query parameters.',
	),
	advancedJsonProperty(
		'taskQueryJson',
		'Advanced Query JSON',
		'task',
		['list'],
		'{\n  "projectid": "project_id"\n}',
		'Optional query string parameters as a JSON object. Values here override filters and additional query parameters.',
	),
	advancedJsonProperty(
		'leadQueryJson',
		'Advanced Query JSON',
		'lead',
		['list'],
		'{\n  "status": "open"\n}',
		'Optional query string parameters as a JSON object. Values here override filters and additional query parameters.',
	),
	advancedJsonProperty(
		'customQueryJson',
		'Advanced Query JSON',
		'customApi',
		['request'],
		'{\n  "limit": 100\n}',
		'Optional query string parameters as a JSON object. Values here override additional query parameters.',
	),
	bodyFieldsProperty,
	advancedJsonProperty(
		'contactBodyJson',
		'Advanced Body JSON',
		'contact',
		['create', 'update'],
		'{\n  "name": "Acme"\n}',
		'Optional request body as a JSON object. Values here override simple fields.',
	),
	advancedJsonProperty(
		'productBodyJson',
		'Advanced Body JSON',
		'product',
		['create', 'update'],
		'{\n  "name": "Product"\n}',
		'Optional request body as a JSON object. Values here override simple fields.',
	),
	advancedJsonProperty(
		'serviceBodyJson',
		'Advanced Body JSON',
		'service',
		['create', 'update'],
		'{\n  "name": "Service"\n}',
		'Optional request body as a JSON object. Values here override simple fields.',
	),
	advancedJsonProperty(
		'documentBodyJson',
		'Advanced Body JSON',
		'document',
		['create', 'update'],
		'{\n  "contactId": "contact_id"\n}',
		'Optional request body as a JSON object. Values here override simple fields.',
	),
	advancedJsonProperty(
		'paymentBodyJson',
		'Advanced Body JSON',
		'payment',
		['create', 'update'],
		'{\n  "amount": 10\n}',
		'Optional request body as a JSON object. Values here override simple fields.',
	),
	advancedJsonProperty(
		'projectBodyJson',
		'Advanced Body JSON',
		'project',
		['create', 'update'],
		'{\n  "name": "Project"\n}',
		'Optional request body as a JSON object. Values here override simple fields.',
	),
	advancedJsonProperty(
		'taskBodyJson',
		'Advanced Body JSON',
		'task',
		['create', 'update'],
		'{\n  "name": "Task"\n}',
		'Optional request body as a JSON object. Values here override simple fields.',
	),
	advancedJsonProperty(
		'leadBodyJson',
		'Advanced Body JSON',
		'lead',
		['create', 'update', 'createTask', 'updateTask'],
		'{\n  "name": "Lead"\n}',
		'Optional request body as a JSON object. Values here override simple fields.',
	),
	advancedJsonProperty(
		'bookingBodyJson',
		'Advanced Body JSON',
		'booking',
		['create'],
		'{\n  "name": "Booking"\n}',
		'Optional request body as a JSON object. Values here override simple fields.',
	),
	advancedJsonProperty(
		'accountingAccountBodyJson',
		'Advanced Body JSON',
		'accountingAccount',
		['create'],
		'{\n  "name": "Account"\n}',
		'Optional request body as a JSON object. Values here override simple fields.',
	),
	advancedJsonProperty(
		'customBodyJson',
		'Advanced Body JSON',
		'customApi',
		['request'],
		'{\n  "name": "Acme"\n}',
		'Optional request body as a JSON object. Values here override simple fields.',
	),
];

function parseJsonObject(value: string, parameterName: string): IDataObject {
	const trimmedValue = value.trim();

	if (trimmedValue === '') {
		return {};
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(trimmedValue);
	} catch {
		throw new ApplicationError(`Parameter "${parameterName}" must contain valid JSON`);
	}

	if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
		throw new ApplicationError(`Parameter "${parameterName}" must be a JSON object`);
	}

	return parsed as IDataObject;
}

function hasValue(value: unknown): boolean {
	return value !== undefined && value !== null && value !== '';
}

function addObjectValues(target: IDataObject, source: IDataObject): void {
	for (const [key, value] of Object.entries(source)) {
		if (hasValue(value)) {
			target[key] = value;
		}
	}
}

function getFixedCollectionPairs(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
): IDataObject {
	const pairs = context.getNodeParameter(parameterName, itemIndex, []) as IDataObject[];
	const values: IDataObject = {};

	for (const pair of pairs) {
		const name = typeof pair.name === 'string' ? pair.name.trim() : '';

		if (name && hasValue(pair.value)) {
			values[name] = pair.value;
		}
	}

	return values;
}

function getFilterParameters(context: IExecuteFunctions, resource: string, itemIndex: number): IDataObject {
	const filterParameterByResource: Record<string, string> = {
		contact: 'contactFilters',
		document: 'documentFilters',
		lead: 'leadFilters',
		payment: 'paymentFilters',
		product: 'productFilters',
		project: 'projectFilters',
		service: 'serviceFilters',
		task: 'taskFilters',
	};
	const filterParameterName = filterParameterByResource[resource];

	if (!filterParameterName) {
		return {};
	}

	const filters = context.getNodeParameter(filterParameterName, itemIndex, {}) as IDataObject;
	const query: IDataObject = {};
	addObjectValues(query, filters);

	return query;
}

function normalizeUnixTimestamp(value: unknown, parameterName: string): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value >= 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
	}

	if (typeof value === 'string') {
		const trimmedValue = value.trim();

		if (trimmedValue === '') {
			throw new ApplicationError(`Parameter "${parameterName}" cannot be empty`);
		}

		const numericValue = Number(trimmedValue);

		if (Number.isFinite(numericValue)) {
			return numericValue >= 1_000_000_000_000 ? Math.floor(numericValue / 1000) : Math.floor(numericValue);
		}

		const dateValue = Date.parse(trimmedValue);

		if (!Number.isNaN(dateValue)) {
			return Math.floor(dateValue / 1000);
		}
	}

	throw new ApplicationError(
		`Parameter "${parameterName}" must be a valid Unix timestamp in seconds, milliseconds, or an ISO date string`,
	);
}

function normalizeTimestampQueryParameters(query: IDataObject): IDataObject {
	const normalizedQuery = {
		...query,
	};

	if (hasValue(normalizedQuery.starttmp)) {
		normalizedQuery.starttmp = normalizeUnixTimestamp(normalizedQuery.starttmp, 'Start Timestamp');
	}

	if (hasValue(normalizedQuery.endtmp)) {
		normalizedQuery.endtmp = normalizeUnixTimestamp(normalizedQuery.endtmp, 'End Timestamp');
	}

	return normalizedQuery;
}

function ensureTimestampRange(query: IDataObject): IDataObject {
	const normalizedQuery = {
		...query,
	};

	if (hasValue(normalizedQuery.starttmp) && !hasValue(normalizedQuery.endtmp)) {
		normalizedQuery.endtmp = Math.floor(Date.now() / 1000);
	}

	if (hasValue(normalizedQuery.endtmp) && !hasValue(normalizedQuery.starttmp)) {
		normalizedQuery.starttmp = 0;
	}

	return normalizedQuery;
}

function getAdvancedQueryJsonParameterName(resource: string): string | undefined {
	const parameterNameByResource: Record<string, string> = {
		contact: 'contactQueryJson',
		customApi: 'customQueryJson',
		document: 'documentQueryJson',
		lead: 'leadQueryJson',
		payment: 'paymentQueryJson',
		product: 'productQueryJson',
		project: 'projectQueryJson',
		service: 'serviceQueryJson',
		task: 'taskQueryJson',
	};

	return parameterNameByResource[resource];
}

function getAdvancedBodyJsonParameterName(resource: string): string | undefined {
	const parameterNameByResource: Record<string, string> = {
		accountingAccount: 'accountingAccountBodyJson',
		booking: 'bookingBodyJson',
		contact: 'contactBodyJson',
		customApi: 'customBodyJson',
		document: 'documentBodyJson',
		lead: 'leadBodyJson',
		payment: 'paymentBodyJson',
		product: 'productBodyJson',
		project: 'projectBodyJson',
		service: 'serviceBodyJson',
		task: 'taskBodyJson',
	};

	return parameterNameByResource[resource];
}

function getQueryParameters(context: IExecuteFunctions, resource: string, itemIndex: number): IDataObject {
	const query: IDataObject = {};
	const advancedQueryJsonParameterName = getAdvancedQueryJsonParameterName(resource);

	if (context.getNodeParameter('useRequestPagination', itemIndex, false) as boolean) {
		addObjectValues(query, context.getNodeParameter('requestPagination', itemIndex, {}) as IDataObject);
	}

	addObjectValues(query, getFilterParameters(context, resource, itemIndex));
	addObjectValues(query, getFixedCollectionPairs(context, 'additionalQueryParameters.parameters', itemIndex));

	if (advancedQueryJsonParameterName) {
		addObjectValues(
			query,
			parseJsonObject(
				(context.getNodeParameter(advancedQueryJsonParameterName, itemIndex, '') as string) || '',
				'Advanced Query JSON',
			),
		);
	}

	return ensureTimestampRange(normalizeTimestampQueryParameters(query));
}

function getDocumentListQueryParameters(context: IExecuteFunctions, itemIndex: number, queryParameters: IDataObject): IDataObject {
	const documentQueryParameters = {
		...queryParameters,
	};
	const returnAll = context.getNodeParameter('returnAll', itemIndex, true) as boolean;

	if (returnAll && !hasValue(documentQueryParameters.starttmp) && !hasValue(documentQueryParameters.endtmp)) {
		documentQueryParameters.starttmp = 0;
		documentQueryParameters.endtmp = Math.floor(Date.now() / 1000);
	}

	return documentQueryParameters;
}

function getDocumentStructuredBody(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const body: IDataObject = {};
	const operation = context.getNodeParameter('operation', itemIndex) as string;
	const contactId = (context.getNodeParameter('documentContactId', itemIndex, '') as string).trim();
	const contactCode = (context.getNodeParameter('documentContactCode', itemIndex, '') as string).trim();
	const contactName = (context.getNodeParameter('documentContactName', itemIndex, '') as string).trim();
	const contactEmail = (context.getNodeParameter('documentContactEmail', itemIndex, '') as string).trim();
	const contactAddress = (context.getNodeParameter('documentContactAddress', itemIndex, '') as string).trim();
	const contactCity = (context.getNodeParameter('documentContactCity', itemIndex, '') as string).trim();
	const contactCp = (context.getNodeParameter('documentContactCp', itemIndex, '') as string).trim();
	const contactProvince = (context.getNodeParameter('documentContactProvince', itemIndex, '') as string).trim();
	const contactCountryCode = (context.getNodeParameter('documentContactCountryCode', itemIndex, '') as string).trim();
	const applyContactDefaults = context.getNodeParameter('documentApplyContactDefaults', itemIndex, true) as boolean;
	const issueDate = (context.getNodeParameter('documentIssueDate', itemIndex, '') as string).trim();
	const dueDate = (context.getNodeParameter('documentDueDate', itemIndex, '') as string).trim();
	const currency = (context.getNodeParameter('documentCurrency', itemIndex, '') as string).trim();
	const notes = (context.getNodeParameter('documentNotes', itemIndex, '') as string).trim();
	const description = (context.getNodeParameter('documentDescription', itemIndex, '') as string).trim();
	const language = (context.getNodeParameter('documentLanguage', itemIndex, '') as string).trim();
	const invoiceNum = (context.getNodeParameter('documentInvoiceNum', itemIndex, '') as string).trim();
	const numSerieId = (context.getNodeParameter('documentNumSerieId', itemIndex, '') as string).trim();
	const paymentMethodId = (context.getNodeParameter('documentPaymentMethodId', itemIndex, '') as string).trim();
	const salesChannelId = (context.getNodeParameter('documentSalesChannelId', itemIndex, '') as string).trim();
	const designId = (context.getNodeParameter('documentDesignId', itemIndex, '') as string).trim();
	const warehouseId = (context.getNodeParameter('documentWarehouseId', itemIndex, '') as string).trim();
	const tags = (context.getNodeParameter('documentTags', itemIndex, '') as string).trim();
	const shippingAddress = (context.getNodeParameter('documentShippingAddress', itemIndex, '') as string).trim();
	const shippingPostalCode = (context.getNodeParameter('documentShippingPostalCode', itemIndex, '') as string).trim();
	const shippingCity = (context.getNodeParameter('documentShippingCity', itemIndex, '') as string).trim();
	const shippingProvince = (context.getNodeParameter('documentShippingProvince', itemIndex, '') as string).trim();
	const shippingCountry = (context.getNodeParameter('documentShippingCountry', itemIndex, '') as string).trim();
	const approve = context.getNodeParameter('documentApprove', itemIndex, false) as boolean;
	const lineItems = context.getNodeParameter('documentItems.items', itemIndex, []) as IDataObject[];

	if (contactId) {
		body.contactId = contactId;
	}

	if (contactCode) {
		body.contactCode = contactCode;
	}

	if (contactName) {
		body.contactName = contactName;
	}

	if (contactEmail) {
		body.contactEmail = contactEmail;
	}

	if (contactAddress) {
		body.contactAddress = contactAddress;
	}

	if (contactCity) {
		body.contactCity = contactCity;
	}

	if (contactCp) {
		body.contactCp = contactCp;
	}

	if (contactProvince) {
		body.contactProvince = contactProvince;
	}

	if (contactCountryCode) {
		body.contactCountryCode = contactCountryCode;
	}

	if (!applyContactDefaults) {
		body.applyContactDefaults = false;
	}

	if (issueDate) {
		body.date = normalizeUnixTimestamp(issueDate, 'Issue Date');
	} else if (operation === 'create') {
		body.date = Math.floor(Date.now() / 1000);
	}

	if (dueDate) {
		body.dueDate = normalizeUnixTimestamp(dueDate, 'Due Date');
	}

	if (currency) {
		body.currency = currency;
	}

	if (notes) {
		body.notes = notes;
	}

	if (description) {
		body.desc = description;
	}

	if (language) {
		body.language = language;
	}

	if (invoiceNum) {
		body.invoiceNum = invoiceNum;
	}

	if (numSerieId) {
		body.numSerieId = numSerieId;
	}

	if (paymentMethodId) {
		body.paymentMethodId = paymentMethodId;
	}

	if (salesChannelId) {
		body.salesChannelId = salesChannelId;
	}

	if (designId) {
		body.designId = designId;
	}

	if (warehouseId) {
		body.warehouseId = warehouseId;
	}

	if (tags) {
		body.tags = tags
			.split(',')
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0);
	}

	if (shippingAddress) {
		body.shippingAddress = shippingAddress;
	}

	if (shippingPostalCode) {
		body.shippingPostalCode = shippingPostalCode;
	}

	if (shippingCity) {
		body.shippingCity = shippingCity;
	}

	if (shippingProvince) {
		body.shippingProvince = shippingProvince;
	}

	if (shippingCountry) {
		body.shippingCountry = shippingCountry;
	}

	if (approve) {
		body.approveDoc = approve;
	}

	if (lineItems.length > 0) {
		body.items = lineItems
			.map((lineItem) => {
				const normalizedItem: IDataObject = {};
				addObjectValues(normalizedItem, lineItem);
				return normalizedItem;
			})
			.filter((lineItem) => Object.keys(lineItem).length > 0);
	}

	if (operation === 'create' && !contactId && !contactCode && !contactName) {
		throw new ApplicationError('Document creation requires Contact ID, Contact Code, or Contact Name');
	}

	return body;
}

function getBodyParameters(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const body: IDataObject = {};
	const resource = context.getNodeParameter('resource', itemIndex) as string;
	const operation = context.getNodeParameter('operation', itemIndex) as string;
	const advancedBodyJsonParameterName = getAdvancedBodyJsonParameterName(resource);

	if (resource === 'document' && ['create', 'update'].includes(operation)) {
		addObjectValues(body, getDocumentStructuredBody(context, itemIndex));
	}

	addObjectValues(body, getFixedCollectionPairs(context, 'bodyFields.fields', itemIndex));

	if (advancedBodyJsonParameterName) {
		addObjectValues(
			body,
			parseJsonObject(
				(context.getNodeParameter(advancedBodyJsonParameterName, itemIndex, '') as string) || '',
				'Advanced Body JSON',
			),
		);
	}

	return body;
}

function isListOperation(resource: string, operation: string): boolean {
	return operation === 'list' && listableResources.includes(resource);
}

function applyOutputLimit(
	context: IExecuteFunctions,
	resource: string,
	operation: string,
	itemIndex: number,
	entries: unknown[],
): unknown[] {
	if (!isListOperation(resource, operation)) {
		return entries;
	}

	const returnAll = context.getNodeParameter('returnAll', itemIndex, true) as boolean;

	if (returnAll) {
		return entries;
	}

	const limit = context.getNodeParameter('limit', itemIndex, 50) as number;

	return entries.slice(0, limit);
}

function ensureLeadingSlash(path: string): string {
	return path.startsWith('/') ? path : `/${path}`;
}

function getRequiredStringParameter(
	context: IExecuteFunctions,
	name: string,
	itemIndex: number,
	displayName: string,
): string {
	const value = (context.getNodeParameter(name, itemIndex) as string).trim();

	if (!value) {
		throw new ApplicationError(`Parameter "${displayName}" cannot be empty`);
	}

	return value;
}

function getCustomApiPath(context: IExecuteFunctions, itemIndex: number): string {
	const customPath = getRequiredStringParameter(context, 'customPath', itemIndex, 'Path');

	if (/^https?:\/\//i.test(customPath)) {
		throw new ApplicationError('Parameter "Path" must be a relative Holded API path, for example /api/invoicing/v1/contacts');
	}

	return ensureLeadingSlash(customPath);
}

function getDocumentType(context: IExecuteFunctions, itemIndex: number): string {
	const documentType = context.getNodeParameter('documentType', itemIndex) as string;

	if (documentType === 'custom') {
		return getRequiredStringParameter(context, 'customDocumentType', itemIndex, 'Custom Document Type');
	}

	return documentType.trim();
}

function normalizeOutput(entry: unknown): IDataObject {
	if (entry === undefined) {
		return {};
	}

	if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) {
		return entry as IDataObject;
	}

	return {
		value: entry,
	};
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

type HoldedRequestOptions = Omit<IHttpRequestOptions, 'method'> & {
	method: IHttpRequestMethods;
};

function buildRequestOptions(
	context: IExecuteFunctions,
	resource: string,
	operation: string,
	itemIndex: number,
): HoldedRequestOptions {
	const requestOptions: HoldedRequestOptions = {
		baseURL: holdedApiBase,
		json: true,
		method: 'GET',
		url: '',
	};

	const queryParameters = getQueryParameters(context, resource, itemIndex);
	const bodyParameters = getBodyParameters(context, itemIndex);

	const setQuery = (parameters = queryParameters) => {
		if (Object.keys(parameters).length > 0) {
			requestOptions.qs = parameters;
		}
	};

	const setBody = () => {
		if (Object.keys(bodyParameters).length > 0) {
			requestOptions.body = bodyParameters;
		}
	};

	switch (resource) {
		case 'contact': {
			const basePath = '/api/invoicing/v1/contacts';

			if (operation === 'list') {
				requestOptions.url = basePath;
				setQuery();
			} else if (operation === 'get') {
				const contactId = getRequiredStringParameter(context, 'contactId', itemIndex, 'Contact ID');
				requestOptions.url = `${basePath}/${encodeURIComponent(contactId)}`;
			} else if (operation === 'create') {
				requestOptions.method = 'POST';
				requestOptions.url = basePath;
				setBody();
			} else if (operation === 'update') {
				const contactId = getRequiredStringParameter(context, 'contactId', itemIndex, 'Contact ID');
				requestOptions.method = 'PUT';
				requestOptions.url = `${basePath}/${encodeURIComponent(contactId)}`;
				setBody();
			} else if (operation === 'delete') {
				const contactId = getRequiredStringParameter(context, 'contactId', itemIndex, 'Contact ID');
				requestOptions.method = 'DELETE';
				requestOptions.url = `${basePath}/${encodeURIComponent(contactId)}`;
			}
			break;
		}

		case 'product': {
			const basePath = '/api/invoicing/v1/products';

			if (operation === 'list') {
				requestOptions.url = basePath;
				setQuery();
			} else if (operation === 'get') {
				const productId = getRequiredStringParameter(context, 'productId', itemIndex, 'Product ID');
				requestOptions.url = `${basePath}/${encodeURIComponent(productId)}`;
			} else if (operation === 'create') {
				requestOptions.method = 'POST';
				requestOptions.url = basePath;
				setBody();
			} else if (operation === 'update') {
				const productId = getRequiredStringParameter(context, 'productId', itemIndex, 'Product ID');
				requestOptions.method = 'PUT';
				requestOptions.url = `${basePath}/${encodeURIComponent(productId)}`;
				setBody();
			} else if (operation === 'delete') {
				const productId = getRequiredStringParameter(context, 'productId', itemIndex, 'Product ID');
				requestOptions.method = 'DELETE';
				requestOptions.url = `${basePath}/${encodeURIComponent(productId)}`;
			}
			break;
		}

		case 'service': {
			const basePath = '/api/invoicing/v1/services';

			if (operation === 'list') {
				requestOptions.url = basePath;
				setQuery();
			} else if (operation === 'get') {
				const serviceId = getRequiredStringParameter(context, 'serviceId', itemIndex, 'Service ID');
				requestOptions.url = `${basePath}/${encodeURIComponent(serviceId)}`;
			} else if (operation === 'create') {
				requestOptions.method = 'POST';
				requestOptions.url = basePath;
				setBody();
			} else if (operation === 'update') {
				const serviceId = getRequiredStringParameter(context, 'serviceId', itemIndex, 'Service ID');
				requestOptions.method = 'PUT';
				requestOptions.url = `${basePath}/${encodeURIComponent(serviceId)}`;
				setBody();
			} else if (operation === 'delete') {
				const serviceId = getRequiredStringParameter(context, 'serviceId', itemIndex, 'Service ID');
				requestOptions.method = 'DELETE';
				requestOptions.url = `${basePath}/${encodeURIComponent(serviceId)}`;
			}
			break;
		}

		case 'document': {
			const documentType = getDocumentType(context, itemIndex);
			const basePath = `/api/invoicing/v1/documents/${encodeURIComponent(documentType)}`;

			if (operation === 'list') {
				requestOptions.url = basePath;
				setQuery(getDocumentListQueryParameters(context, itemIndex, queryParameters));
			} else if (operation === 'get') {
				const documentId = getRequiredStringParameter(context, 'documentId', itemIndex, 'Document ID');
				requestOptions.url = `${basePath}/${encodeURIComponent(documentId)}`;
			} else if (operation === 'create') {
				requestOptions.method = 'POST';
				requestOptions.url = basePath;
				setBody();
			} else if (operation === 'update') {
				const documentId = getRequiredStringParameter(context, 'documentId', itemIndex, 'Document ID');
				requestOptions.method = 'PUT';
				requestOptions.url = `${basePath}/${encodeURIComponent(documentId)}`;
				setBody();
			} else if (operation === 'delete') {
				const documentId = getRequiredStringParameter(context, 'documentId', itemIndex, 'Document ID');
				requestOptions.method = 'DELETE';
				requestOptions.url = `${basePath}/${encodeURIComponent(documentId)}`;
			}
			break;
		}

		case 'payment': {
			const basePath = '/api/invoicing/v1/payments';

			if (operation === 'list') {
				requestOptions.url = basePath;
				setQuery();
			} else if (operation === 'get') {
				const paymentId = getRequiredStringParameter(context, 'paymentId', itemIndex, 'Payment ID');
				requestOptions.url = `${basePath}/${encodeURIComponent(paymentId)}`;
			} else if (operation === 'create') {
				requestOptions.method = 'POST';
				requestOptions.url = basePath;
				setBody();
			} else if (operation === 'update') {
				const paymentId = getRequiredStringParameter(context, 'paymentId', itemIndex, 'Payment ID');
				requestOptions.method = 'PUT';
				requestOptions.url = `${basePath}/${encodeURIComponent(paymentId)}`;
				setBody();
			} else if (operation === 'delete') {
				const paymentId = getRequiredStringParameter(context, 'paymentId', itemIndex, 'Payment ID');
				requestOptions.method = 'DELETE';
				requestOptions.url = `${basePath}/${encodeURIComponent(paymentId)}`;
			}
			break;
		}

		case 'project': {
			const basePath = '/api/projects/v1/projects';

			if (operation === 'list') {
				requestOptions.url = basePath;
				setQuery();
			} else if (operation === 'get') {
				const projectId = getRequiredStringParameter(context, 'projectId', itemIndex, 'Project ID');
				requestOptions.url = `${basePath}/${encodeURIComponent(projectId)}`;
			} else if (operation === 'create') {
				requestOptions.method = 'POST';
				requestOptions.url = basePath;
				setBody();
			} else if (operation === 'update') {
				const projectId = getRequiredStringParameter(context, 'projectId', itemIndex, 'Project ID');
				requestOptions.method = 'PUT';
				requestOptions.url = `${basePath}/${encodeURIComponent(projectId)}`;
				setBody();
			} else if (operation === 'delete') {
				const projectId = getRequiredStringParameter(context, 'projectId', itemIndex, 'Project ID');
				requestOptions.method = 'DELETE';
				requestOptions.url = `${basePath}/${encodeURIComponent(projectId)}`;
			}
			break;
		}

		case 'task': {
			const basePath = '/api/projects/v1/tasks';

			if (operation === 'list') {
				requestOptions.url = basePath;
				setQuery();
			} else if (operation === 'get') {
				const taskId = getRequiredStringParameter(context, 'taskId', itemIndex, 'Task ID');
				requestOptions.url = `${basePath}/${encodeURIComponent(taskId)}`;
			} else if (operation === 'create') {
				requestOptions.method = 'POST';
				requestOptions.url = basePath;
				setBody();
			} else if (operation === 'update') {
				const taskId = getRequiredStringParameter(context, 'taskId', itemIndex, 'Task ID');
				requestOptions.method = 'PUT';
				requestOptions.url = `${basePath}/${encodeURIComponent(taskId)}`;
				setBody();
			} else if (operation === 'delete') {
				const taskId = getRequiredStringParameter(context, 'taskId', itemIndex, 'Task ID');
				requestOptions.method = 'DELETE';
				requestOptions.url = `${basePath}/${encodeURIComponent(taskId)}`;
			}
			break;
		}

		case 'lead': {
			const basePath = '/api/crm/v1/leads';

			if (operation === 'list') {
				requestOptions.url = basePath;
				setQuery();
			} else if (operation === 'get') {
				const leadId = getRequiredStringParameter(context, 'leadId', itemIndex, 'Lead ID');
				requestOptions.url = `${basePath}/${encodeURIComponent(leadId)}`;
			} else if (operation === 'create') {
				requestOptions.method = 'POST';
				requestOptions.url = basePath;
				setBody();
			} else if (operation === 'update') {
				const leadId = getRequiredStringParameter(context, 'leadId', itemIndex, 'Lead ID');
				requestOptions.method = 'PUT';
				requestOptions.url = `${basePath}/${encodeURIComponent(leadId)}`;
				setBody();
			} else if (operation === 'delete') {
				const leadId = getRequiredStringParameter(context, 'leadId', itemIndex, 'Lead ID');
				requestOptions.method = 'DELETE';
				requestOptions.url = `${basePath}/${encodeURIComponent(leadId)}`;
			} else if (operation === 'createTask') {
				const leadId = getRequiredStringParameter(context, 'leadId', itemIndex, 'Lead ID');
				requestOptions.method = 'POST';
				requestOptions.url = `${basePath}/${encodeURIComponent(leadId)}/tasks`;
				setBody();
			} else if (operation === 'updateTask') {
				const leadId = getRequiredStringParameter(context, 'leadId', itemIndex, 'Lead ID');
				requestOptions.method = 'PUT';
				requestOptions.url = `${basePath}/${encodeURIComponent(leadId)}/tasks`;
				setBody();
			}
			break;
		}

		case 'booking': {
			requestOptions.method = 'POST';
			requestOptions.url = '/api/crm/v1/bookings';
			setBody();
			break;
		}

		case 'accountingAccount': {
			requestOptions.method = 'POST';
			requestOptions.url = '/api/accounting/v1/account';
			setBody();
			break;
		}

		case 'customApi': {
			const customMethod = context.getNodeParameter('customMethod', itemIndex) as IHttpRequestMethods;

			requestOptions.method = customMethod;
			requestOptions.url = getCustomApiPath(context, itemIndex);
			setQuery();

			if (!['GET', 'DELETE'].includes(customMethod)) {
				setBody();
			}
			break;
		}

		default:
			throw new ApplicationError(`Unsupported resource "${resource}"`);
	}

	if (!requestOptions.url) {
		throw new ApplicationError(`Unsupported operation "${operation}" for resource "${resource}"`);
	}

	return requestOptions;
}

export class Holded implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Holded',
		name: 'holded',
		icon: 'file:holded.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Manage Holded contacts, documents, payments, projects, tasks, leads, and custom API requests',
		defaults: {
			name: 'Holded',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'holdedApi',
				required: true,
			},
		],
		properties,
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const requestOptions = buildRequestOptions(this, resource, operation, itemIndex);
				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'holdedApi',
					requestOptions,
				);

				const responseEntries = Array.isArray(response) ? response : [response];
				const entries = applyOutputLimit(this, resource, operation, itemIndex, responseEntries);

				for (const entry of entries) {
					returnData.push({
						json: normalizeOutput(entry),
						pairedItem: {
							item: itemIndex,
						},
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: getErrorMessage(error),
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}

				throw new NodeOperationError(this.getNode(), error, {
					itemIndex,
				});
			}
		}

		return [returnData];
	}
}
