// when a peer sends a transaction:
// it has the version number (number of changes since inception) that the transaction is based on.
// the model change may not be in that base yet. So two edit events coming from different peers may have the same version number.
// the model sequences them, meaning that a change can have a different basis.
// then we rebase the off base one and incorporate into the Authority and publish



import {CodeMirror} from "./renkon-codemirror.js";
export {CodeMirror} from "./renkon-codemirror.js";

const {ChangeSet, Text} = CodeMirror.state;
const {receiveUpdates, rebaseUpdates, sendableUpdates, collab, getClientID, getSyncedVersion} = CodeMirror.collab;
const {ViewPlugin} = CodeMirror.view;

class TextWrapper {
  constructor(text) {
    this.text = text;
  }
}

export class CodeMirrorModel extends Croquet.Model {
  init(options) {
    this.doc = new TextWrapper(Text.of(options.doc || ["hello"]));
    this.version = 0;
    this.updates = []; // [{clientID, version, updates}]
    this.subscribe(this.id, "collabMessage", this.collabMessage);
  }

  static types() {
    return {
      TextWrapper: {
        cls: TextWrapper,
        write: (obj) => {
          return obj.text.toJSON();
        },
        read: (data) => {
          return new TextWrapper(Text.of(data));
        }
      }
    }
  }

  collabMessage(event) {
    const {version, clientID, updates} = event;
    if (updates.length === 0) {return;}
    let received = updates.map(json => ({
      clientID: json.clientID,
      changes: ChangeSet.fromJSON(json.changes)
    }));
    let rawUpdates = received.map(json => ({
      clientID: json.clientID,
      changes: json.changes.toJSON()
    }));
    let base;
    let end;
    console.log("pre model version", version, this.version);
    if (version != this.version) {
      base = this.updates.findIndex((obj) => obj.version >= version);
      end = this.updates.length;
      if (base >= 0) {
        for (let i = base; i < end; i++) {
          let baseUpdates = this.updates[i];
          let updates = baseUpdates.updates.map(json => ({
            clientID: json.clientID,
            changes: ChangeSet.fromJSON(json.changes)
          }));
          received = rebaseUpdates(received, updates);
        }
      }
    }
    for (let i = 0; i < received.length; i++) {
      const update = received[i];
      this.doc = new TextWrapper(update.changes.apply(this.doc.text));
      console.log(this.doc.text);
    }
    this.version++;
    const message = {version, clientID, updates: rawUpdates, base, end};
    this.updates.push(message);
    console.log("post model version", this.version);
    this.publish(this.id, "collabUpdate", message);
  }
}

CodeMirrorModel.register("CodeMirrorModel");

export class CodeMirrorView extends Croquet.View {
  constructor(model, extensions) {
    super(model);
    this.model = model;
    this.lastSent = -1;
    this.subscribe(this.model.id, "collabUpdate", this.collabUpdate);
    const config = this.viewConfig(this.model.doc.text, extensions || []);
    this.view = new CodeMirror.EditorView(config);
    this.clientID = getClientID(this.view.state);
    console.log(getClientID(this.view.state));
  }

  viewConfig(doc, extensions) {
    return {
      doc: doc || "",
      extensions: [...extensions, collab({startVersion: this.model.version}), ViewPlugin.define(_view => this)]
    }
  }

  pushUpdates(version, fullUpdates) {
    if (false) {
      console.log("duplicate for some reason. skipping", getClientID(this.view.state));
      return;
    }
    let updates = fullUpdates.map(u => ({
      clientID: u.clientID,
      changes: u.changes.toJSON()
    }));
    console.log("push", getClientID(this.view.state), version, updates);
    this.publish(this.model.id, "collabMessage", {version, clientID: this.clientID, updates});
  }

  pullUpdates(version) {
    const updates = this.model.updates;
    if (updates.length === 0) {return;}
    if (this.view.dom.id === "e1" && version === 0) debugger;
    const filtered = updates.filter(u => u.version >= version && u.updates[0].clientID !== this.clientID);
    return filtered;
  }

  collabUpdate() {
    const version = getSyncedVersion(this.view.state);
    console.log("collabUpdate pre", this.view.dom.id, version);
    const viewUpdates = this.pullUpdates(version);
    this.receiving = true;
    try {
      for (let i = 0; i < viewUpdates.length; i++) {
        debugger;
        const obj = viewUpdates[i];
        let receivedUpdates = obj.updates.map(json => ({
          clientID: json.clientID,
          changes: ChangeSet.fromJSON(json.changes)
        }));

        if (obj.base !== undefined) {
          for (let j = obj.base; j < obj.end; j++) {
            const baseUpdatesObj = this.model.updates[j];
            let baseUpdates = baseUpdatesObj.updates.map(json => ({
              clientID: json.clientID,
              changes: ChangeSet.fromJSON(json.changes)
            }));
            receivedUpdates = rebaseUpdates(receivedUpdates, baseUpdates);
          }
        }
        const final = receiveUpdates(this.view.state, receivedUpdates);
        this.view.dispatch(final);
      }
    } finally {
      this.receiving = false;
    }
    console.log("collabUpdate post", this.view.dom.id, getSyncedVersion(this.view.state));
  }

  update(update) {
    if (update.docChanged) {
      console.log("view update", this.view.dom.id, getSyncedVersion(this.view.state), update);
      this.push();
    }
  }

  push() {
    if (this.receiving) {return;}
    let version = getSyncedVersion(this.view.state);
    let updates = sendableUpdates(this.view.state);
    if (updates.length === 0) {return;}
    this.pushUpdates(version, updates);
    // Regardless of whether the push failed or new updates came in
    // while it was running, try again if there's updates remaining
    //
    // if (sendableUpdates(this.view.state).length) {
    // setTimeout(() => this.push(), 100)
  // }
  }

  getDocument() {
    return {
      version: this.model.version,
      doc: this.model.doc.text,
    }
  }

  destroy() {
    super.destroy();
    this.done = true;
  }

  /*
  pull() {
    let version = getSyncedVersion(this.view.state);
    let updates = this.pullUpdates(version);
    this.view.dispatch(receiveUpdates(this.view.state, updates));
    }
  */
}

/* globals Croquet */
