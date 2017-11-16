import React from 'react';
import CharacterStore from '../stores/CharacterStore';
import CharacterActions from '../actions/CharacterActions';

class Character extends React.Component {
	constructor(props){
		super(props);
		this.state = CharacterStore.getState();
		this.onChange = this.onChange.bind(this);
	}

	componentDidMount() {
		CharacterStore.listen(this.onChange);
		CharacterActions.getCharacter(this.props.params.id);

		
	}

	componentWillUnmount() {
		console.log("character will unmount!!!");
		CharacterStore.unlisten(this.onChange);
		
	}

	componentDidUpdate(prevProps) {
		//id变化，但组件并未umount，当id变化引起组件state变化的时候，会重新获取新id角色信息
		if(prevProps.params.id !== this.props.params.id) {
			CharacterActions.getCharacter(this.props.params.id);
		}
	}

	onChange(state){
		this.setState(state);
	}

	render() {
		return (
			<div className='container'>
				<div className='profile-img'>
					<a className='magnific-popup' href={'/img/character.jpg'}>
						<img src={'/img/character.jpg'} />
					</a>
				</div>
				<div className='profile-info clearfix'>
					<h2><strong>{this.state.name}</strong></h2>
					<h4 className='lead'>Race: <strong>{this.state.race}</strong></h4>
					<h4 className='lead'>Bloodline: <strong>{this.state.bloodline}</strong></h4>
					<h4 className='lead'>Gender: <strong>{this.state.gender}</strong></h4>
					<button className='btn btn-transparent'
										onClick={CharacterActions.report.bind(this,this.state.characterId)}
										disabled={this.state.isReported}>
						{this.state.isReported ? 'Reproted' : 'Report Character'}
					</button>
				</div>
				<div className='profile-stats clearfix'>
					<ul>
						<li><span className='stats-number'>{this.state.winLossRatio}</span>Winning Percentage</li>
						<li><span className='stats-number'>{this.state.wins}</span> Wins</li>
						<li><span className='stats-number'>{this.state.losses}</span> Losses</li>
					</ul>
				</div>
			</div>
			);
	}
}

Character.contextTypes = {
	router: React.PropTypes.func.isRequired
};

export default Character;