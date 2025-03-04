import { proxy } from "valtio";
import Project from "./project";

interface Store {
  project: Project;
  playing: boolean;
}

const store = proxy<Store>({
  project: new Project("", "Default Project", [], []),
  playing: false
});

export default store;