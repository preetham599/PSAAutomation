
class WorkspacePage {

  workspaceMenu(name) {return `//div//h3[text()="${name}"]//following-sibling::button[@aria-haspopup="menu"]`;}
  menuItem(name){return `//div[@role="menuitem" and text()="${name}"]`}
  btnSettings(){return `//div//*[local-name()="svg" and contains(@class,"settings")]`}
}

module.exports = new WorkspacePage();
