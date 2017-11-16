import alt from '../alt';
import HomeActions from '../actions/HomeActions';

class HomeStore {
  constructor() {
    this.bindActions(HomeActions);
    this.characters = [];
	this.title='Click on the portrait. Select your favorite.';
  }

  onGetTwoCharactersSuccess(data) {
    this.characters = data;
  }

  onGetTwoCharactersFail(errorMessage) {
    toastr.error(errorMessage);
  }

  onNeedToAdd(data){
	  this.title=data;
  }
  
  onVoteFail(errorMessage) {
    toastr.error(errorMessage);
  }
}

export default alt.createStore(HomeStore);