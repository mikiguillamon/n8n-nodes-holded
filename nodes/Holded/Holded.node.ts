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

const documentTypeProperty = simpleStringProperty(
	'documentType',
	'Document Type',
	['document'],
	['list', 'get', 'create', 'update', 'delete'],
	'Document type segment used by Holded, for example invoice, salesreceipt or estimate',
	'invoice',
);

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
	customMethodProperty,
	simpleStringProperty(
		'customPath',
		'Path',
		['customApi'],
		['request'],
		'Absolute Holded API path, beginning with /api/...',
		'/api/invoicing/v1/contacts',
	),
	jsonProperty(
		'queryJson',
		'Query JSON',
		['contact', 'product', 'service', 'document', 'payment', 'project', 'task', 'lead', 'customApi'],
		['list', 'request'],
		'{\n  "phone": "+34999999999"\n}',
		'Optional query string parameters as a JSON object',
	),
	jsonProperty(
		'bodyJson',
		'Body JSON',
		[
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
		],
		['create', 'update', 'createTask', 'updateTask', 'request'],
		'{\n  "name": "Acme"\n}',
		'Request body as a JSON object',
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

	const queryJson = parseJsonObject(
		(context.getNodeParameter('queryJson', itemIndex, '') as string) || '',
		'Query JSON',
	);
	const bodyJson = parseJsonObject(
		(context.getNodeParameter('bodyJson', itemIndex, '') as string) || '',
		'Body JSON',
	);

	const setQuery = () => {
		if (Object.keys(queryJson).length > 0) {
			requestOptions.qs = queryJson;
		}
	};

	const setBody = () => {
		if (Object.keys(bodyJson).length > 0) {
			requestOptions.body = bodyJson;
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
			const documentType = getRequiredStringParameter(context, 'documentType', itemIndex, 'Document Type');
			const basePath = `/api/invoicing/v1/documents/${encodeURIComponent(documentType)}`;

			if (operation === 'list') {
				requestOptions.url = basePath;
				setQuery();
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
		description: 'Consume the Holded API',
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

				const entries = Array.isArray(response) ? response : [response];

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
