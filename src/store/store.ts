import { proxy } from "valtio";
import Project from "./project";

interface Store {
  project: Project;
}

const store = proxy<Store>({
  project: new Project("", "Default Project", []),
});

export default store;