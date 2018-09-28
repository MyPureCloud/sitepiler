class PageData {
	constructor() {
		this.pageSettings = {};
		this.body = '';
	}

	static is(d) { return d instanceof PageData; }
}



module.exports = PageData;
