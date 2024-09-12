## A Todos web app that syncs to the cloud

### Usage
- **Log In / Sign Up / Local**: Enter a username and password to create an account. If the username is already taken, choose another. Alternatively, create a local database by clicking the button below the login button.
    - Note that local databases are only stored in that specific browser you used to write your todos.
    - Also note that incognito / private windows will delete this data as soon as your session ends - effectively disabling the persistance of the todos that you wrote
- **Create a todo**: After logging in, type your task in the input box and press enter. The newly created todo will appear in the list.
- **Search for todos**: Click the search icon on the right side of the input box to enable search mode (the icon will darken). Type keywords to search; any matching word will display the corresponding todos. Click the search icon again to exit search mode.
- **Tag a todo**: Enter your todo text, but don't press enter. Click the tag icon next to the search icon, which will clear the input and refocus it. Now, enter your tag and press enter. The list will now show your todo with a tag above it.
- **Star a todo**: Click the hollowed out star button next to the todo to move it to the starred section.
- **Unstar a todo**: Similarly, click the filled star button next to the todo to move it to the unstarred section.
- **Delete a todo**: Click the `x` button next to the todo to remove it.
    - This deletion can be reverted if <Ctrl-Z> is pressed during the active session (This data is not saved anywhere if you close the tab)
- **Edit a todo**: Click the edit button (resembling a pencil) next to the todo. Modify the todo text in the input box and press enter to save changes. (Note: Tags cannot be edited.)
- **Complete a todo**: Click anywhere next to the text or checkbox to mark a todo as completed.
- **Timestamps**: Hover over any todo to see creation and edit (if any) timestamps