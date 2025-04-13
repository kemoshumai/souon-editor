import { proxy } from "valtio";
import Project from "./project";

interface Store {
  project: Project;
  playing: boolean;
  items: string[];// DndKitのSortableContext用
  saved: boolean;// 保存されているかどうか
}

const store = proxy<Store>({
  project: new Project("", "Default Project", [], []),
  playing: false,
  items: [],
  saved: false,
});

export default store;