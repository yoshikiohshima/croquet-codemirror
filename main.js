import {CodeMirror, CodeMirrorModel, CodeMirrorView} from "./croquet-codemirror.js";

window.CodeMirror = CodeMirror;
const {ChangeSet} = CodeMirror.state;

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
    this.editor1 = new CodeMirrorView(this.model.editor);
    this.editor1.view.dom.id = "e1";
    document.body.appendChild(this.editor1.view.dom);

    this.editor2 = new CodeMirrorView(this.model.editor);
    this.editor2.view.dom.id = "e2";
    document.body.appendChild(this.editor2.view.dom);

    window.topView = this;

    this.testButton = document.createElement("button");
    this.testButton.id = "test-button";
    this.testButton.textContent = "test";
    document.body.appendChild(this.testButton);
    this.testButton.addEventListener("click", () => {
      this.insertText(this.editor1.view, "1");
      this.insertText(this.editor2.view, "2");
    });
  }

  insertText(view, text) {
    const {state} = view;
    const range = state.selection.main;
    const changes = ChangeSet.of([{from: range.from, to: range.to, insert: text}], state.doc.length);
    view.dispatch({changes});
  }

  detach() {
    console.log("detach");
    if (this.editor1) {
      this.editor1.view.dom.remove();
      this.editor1.destroy();
      this.editor1 = null;
    }
    if (this.editor2) {
      this.editor2.view.dom.remove();
      this.editor2.destroy();
      this.editor2 = null;
    }
    super.detach();
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
