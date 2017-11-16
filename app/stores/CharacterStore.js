import {assign,includes} from 'lodash';
import alt from '../alt';
import CharacterActions from '../actions/CharacterActions';

class CharacterStore {
	constructor() {
		this.bindActions(CharacterActions);
		this.characterId  = 0;
		this.name         = 'TBD';
		this.race         = 'TBD';
		this.bloodline    = 'TBD';
		this.gender       = 'TBD';
		this.wins         = 0;
		this.losses       = 0;
		this.winLossRatio = 0;
		this.isReported   = false;
	}

	onGetCharacterSuccess(data) {
		assign(this,data);
		
		let localData = localStorage.getItem('NEF') ? JSON.parse(localStorage.getItem('NEF')) : {};
		let reports = localData.reports || [];
		this.isReported = includes(reports,this.characterId);
		this.winLossRatio = ((this.wins / (this.wins + this.losses) * 100) || 0).toFixed(1);
	}

	onGetCharacterFail(jqXhr) {
		toastr.error(jqXhr.responseJSON.message);
	}

	onReportSuccess() {
		this.isReported = true;
		let localData = localStorage.getItem('NEF') ? JSON.parse(localStorage.getItem('NEF')) :{};
		localData.reports = localData.reports || [];
		localData.reports.push(this.characterId);
		localStorage.setItem('NEF', JSON.stringify(localData));
		toastr.warning('Character has been reported');
	}

	onReportFail(jqXHr) {
		toastr.error(jqXHr.responseJSON.message);
	}
}

export default alt.createStore(CharacterStore);