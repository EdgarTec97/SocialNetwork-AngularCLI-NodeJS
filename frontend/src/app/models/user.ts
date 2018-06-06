export class User{
	
	constructor(
		public _id     :string,
		public name    :string,
		public surname :string,
		public nick    :string,
		public email   :string,
		public password:string,
		public role    :string,
		public image   :string,
		public status  :string,
		public gettoken:any		// gettoken no está en la bd
		) {
		// code...
	}
}