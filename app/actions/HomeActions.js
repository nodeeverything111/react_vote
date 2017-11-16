import alt from '../alt';

class HomeActions {
  constructor() {
    this.generateActions(
      'getTwoCharactersSuccess',
	  'needToAdd',
      'getTwoCharactersFail',
      'voteFail'
    );
  }

  getTwoCharacters() {
    $.ajax({ url: '/api/characters' })
      .done(data => {
        this.actions.getTwoCharactersSuccess(data);
      })
      .fail(jqXhr => {
		if(jqXhr.status===409){
			this.actions.needToAdd(jqXhr.responseJSON.message);
		}
		else{
			this.actions.getTwoCharactersFail(jqXhr.responseJSON.message);
		}
        
      });
  }

  vote(winner, loser) {
    $.ajax({
      type: 'PUT',
      url: '/api/characters' ,
      data: { winner: winner, loser: loser }
    })
      .done(() => {
        this.actions.getTwoCharacters();
      })
      .fail((jqXhr) => {
        this.actions.voteFail(jqXhr.responseJSON.message);
      });
  }
}

export default alt.createActions(HomeActions);