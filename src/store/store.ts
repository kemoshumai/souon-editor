import { proxy } from "valtio";
import Chart from "./chart";

interface Store {
  charts: Chart[]
}

const store = proxy<Store>({
  charts: []
});

export default store;