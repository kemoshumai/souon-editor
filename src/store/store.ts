import { proxy } from "valtio";
import Project from "./project";
import TempoEvent from "./tempoEvent";
import TemporalPosition from "./temporalPosition";

interface Store {
  project: Project;
}

const store = proxy<Store>({
  project: new Project("", "Default Project", [], [TempoEvent.createWithRandomUUID(new TemporalPosition(0n), 120, 4)]),
});

export default store;