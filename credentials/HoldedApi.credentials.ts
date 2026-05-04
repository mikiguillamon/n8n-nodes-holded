import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

const licenseValidationConfig = {
	minimumLength: 10,
	mode: 'local' as 'local' | 'remote',
	serverUrl: '',
	timeoutMs: 5000,
};

type LicenseValidationResult = {
	reason?: string;
	valid: boolean;
};

function validateLicenseLocally(licenseKey: string): LicenseValidationResult {
	if (licenseKey.trim().length >= licenseValidationConfig.minimumLength) {
		return { valid: true };
	}

	return {
		reason: `License key must contain at least ${licenseValidationConfig.minimumLength} characters`,
		valid: false,
	};
}

async function validateLicenseRemotely(licenseKey: string): Promise<LicenseValidationResult> {
	if (!licenseValidationConfig.serverUrl) {
		return {
			reason: 'License validation server URL is not configured',
			valid: false,
		};
	}

	try {
		const response = await fetch(licenseValidationConfig.serverUrl, {
			body: JSON.stringify({ licenseKey }),
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
			signal: AbortSignal.timeout(licenseValidationConfig.timeoutMs),
		});

		if (!response.ok) {
			return {
				reason: `License validation server responded with status ${response.status}`,
				valid: false,
			};
		}

		const payload = (await response.json()) as { message?: string; valid?: boolean };

		return {
			reason: payload.message,
			valid: payload.valid === true,
		};
	} catch (error) {
		return {
			reason: error instanceof Error ? error.message : 'Unknown license validation error',
			valid: false,
		};
	}
}

async function validateLicenseKey(licenseKey: string): Promise<LicenseValidationResult> {
	if (licenseValidationConfig.mode === 'remote') {
		return await validateLicenseRemotely(licenseKey);
	}

	return validateLicenseLocally(licenseKey);
}

async function authenticateWithLicense(
	credentials: ICredentialDataDecryptedObject,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const licenseKey = typeof credentials.licenseKey === 'string' ? credentials.licenseKey : '';
	const validation = await validateLicenseKey(licenseKey);

	if (!validation.valid) {
		throw new ApplicationError(validation.reason ?? 'Invalid license key');
	}

	requestOptions.headers = {
		...(requestOptions.headers ?? {}),
		Accept: 'application/json',
		'Content-Type': 'application/json',
		key: credentials.apiKey as string,
	};

	return requestOptions;
}

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
		{
			displayName: 'License Key',
			name: 'licenseKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'License key required to use this node',
		},
	];

	authenticate = authenticateWithLicense;

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.holded.com',
			url: '/api/invoicing/v1/contacts',
			method: 'GET',
		},
	};
}
