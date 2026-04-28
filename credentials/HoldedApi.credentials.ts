import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HoldedApi implements ICredentialType {
	name = 'holdedApi';

	displayName = 'Holded API';

	icon = 'file:holded.svg' as const;

	documentationUrl = 'https://developers.holded.com/reference/api-key-1';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Holded API key',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				key: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.holded.com',
			url: '/api/invoicing/v1/contacts',
			method: 'GET',
		},
	};
}
