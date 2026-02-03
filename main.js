import {CodeMirror, CodeMirrorModel, CodeMirrorView} from "./croquet-codemirror.js";

window.CodeMirror = CodeMirror;

const apiKey = "234567_Paste_Your_Own_API_Key_Here_7654321";
const box = "http://localhost:8888";
const name = "editor";

const appId = "org.tinlizzie.editor";
const tps = 0;
const eventRateLimit = 60;
const autoSleep = 0;

class TopModel extends Croquet.Model {
  init(options) {
    super.init();
    this.editor = CodeMirrorModel.create({doc: ["hello"]});
  }
}

TopModel.register("TopModel");

class TopView extends Croquet.View {
  constructor(model) {
    super(model);
    this.model = model;
    this.editor = new CodeMirrorView(this.model.editor);
    document.body.appendChild(this.editor.editor.dom);
  }
}

const appParameters = {
  apiKey,
  box,
  appId,
  eventRateLimit,
  name: Croquet.App.autoSession("q"),
  password: "1",
  view: TopView,
  model: TopModel,
};

const session = await window.Croquet.Session.join(appParameters);
