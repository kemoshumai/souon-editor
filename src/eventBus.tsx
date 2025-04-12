import mitt from 'mitt';
import TemporalPosition from './store/temporalPosition';

export const scrollTo = mitt<{ pos: TemporalPosition }>();
export const scrollToByPercent = mitt<{ pos: number }>();