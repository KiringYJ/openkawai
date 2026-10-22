import './styles.css';
import { DEFAULT_LAYOUT } from './content/layouts';
import { GameSession } from './game/session';
import { GameView } from './ui/game-view';

const session = new GameSession({ layout: DEFAULT_LAYOUT });

new GameView(session);
