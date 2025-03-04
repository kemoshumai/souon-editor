import { proxy } from "valtio";
import Project from "./project";

interface Store {
  project: Project;
  playing: boolean;
  items: string[];// DndKitのSortableContext用
}

const store = proxy<Store>({
  project: new Project("", "Default Project", [], []),
  playing: false,
  items: []
});

export default store;