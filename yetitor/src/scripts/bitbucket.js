/* globals axios */

class Bitbucket {
	constructor(host, clientId) {
		console.log(`Initializing bitbucket API using ${host}`);
		this.host = host;
		this.clientId = clientId;
	}

	authorize(force) {
		if (force) {
			delete this.access_token;
			localStorage.removeItem('bb_access_token');
		}

		// Get from hash
		const hash = {};
		window.location.hash
			.substring(1)
			.split('&')
			.forEach((part) => {
				if (part === '') return;
				const parts = part.split('=');
				hash[parts[0]] = parts[1];
			});
		if (hash.access_token) {
			this.access_token = hash.access_token.replace('%3D', '=');
			localStorage.setItem('bb_access_token', this.access_token);
			window.location.hash = '';
			console.log('Got token from hash');
			this._initAxios();
			return;
		}

		// Get from storage
		this.access_token = localStorage.getItem('bb_access_token');
		if (this.access_token) {
			console.log('Got token from storage');
			this._initAxios();
			return;
		}

		// Get new token
		window.location.href = `https://bitbucket.org/site/oauth2/authorize?client_id=${this.clientId}&response_type=token`;
	}

	listBranches(owner, repo) {
		return new Promise((resolve, reject) => {
			this.axios
				.get(`https://${this.host}/2.0/repositories/${owner}/${repo}/refs/branches`, {
					params: {
						pagelen: 100,
						q: 'type = "branch" AND name != "master"'
					}
				})
				.then((response) => {
					//TODO: Implement paging to get more than 100 branches. Workaround: search
					//TODO: Implement repo search field
					resolve(response.data.values);
				})
				.catch((err) => this._handleApiError(err, reject));
		});
	}

	listFiles(owner, repo, target, path) {
		return new Promise((resolve, reject) => {
			this.axios
				.get(`https://${this.host}/2.0/repositories/${owner}/${repo}/src/${target}/${path || ''}`, {
					params: {
						pagelen: 100
					}
				})
				.then((response) => {
					resolve(response.data.values || response.data);
				})
				.catch((err) => this._handleApiError(err, reject));
		});
	}

	_handleApiError(err, reject) {
		if (err.response) {
			console.log(err.response);
			if (err.response.status === 401) {
				console.log('401');
				// Force reauthorize when token is invalid
				this.authorize(true);
			}
		}
		if (typeof reject === 'function') reject(err);
	}

	_initAxios() {
		this.axios = axios.create({
			baseURL: `https://${this.host}`,
			headers: {
				Authorization: `Bearer ${this.access_token}`
			}
		});
	}

	_encodeQuery(queryData) {
		// https://developer.atlassian.com/bitbucket/api/2/reference/meta/filtering
		let parts = [];
		queryData.forEach((query) => {
			parts.push(`${query.key} ${query.operator || '='} "${query.value}"`);
		});
		return encodeURI(parts.join(' AND '));
	}
}

const bitbucket = new Bitbucket('api.bitbucket.org', '7PKyHCBGEuqZaCuJ5n');
