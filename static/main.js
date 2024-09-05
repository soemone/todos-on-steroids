// Caution: Messy code ahead. 

const todo_list = document.querySelector('#todos-list');
const todo_input = document.querySelector('#todos-input');
let starred_todos = document.querySelector("#starred");
let other_todos = document.querySelector("#other");
const tag = document.querySelector("#tag");
const search = document.querySelector("#search");
const tooltip = document.querySelector("#hover-tooltip");
const form_login = document.querySelector("#form-login");
const no_login = document.querySelector("#no-login");
const logout = document.querySelector("#logout");
const login = document.querySelector("#login");
const trying_login = document.querySelector("#trying-login");
const username = document.querySelector("#username");
const password = document.querySelector("#password");
const modal = document.querySelector('#modal');

const removed_elements = [];

let edit_element = null;
let todo_counter = 0;
let prev_input_txt = null;
let searching = false;
let jwt = null;

const load = async () => {
    console.log('loaded scripts.');
    
    username.addEventListener('keypress', (e) => {
        if ((e.keyCode == 13 || e.key == 'Enter') && password.value.trim() == '') {
            e.preventDefault();
            password.focus();
        } else if (e.keyCode == 13 || e.key == 'Enter') {
            form_login.click();
        }
    });

    password.addEventListener('keypress', (e) => {
        if (e.keyCode == 13 || e.key == 'Enter') {
            e.preventDefault();
            form_login.click();
        }
    });

    if (document.cookie) {
        const selector = `${encodeURIComponent('jwt')}=`;
        const idx = document.cookie.indexOf(selector);
        if (idx !== -1) {
            console.log('attempting to login with saved cookie...');
            trying_login.classList.remove('hide');
            const end = document.cookie.indexOf(';');
            jwt = document.cookie.substring(idx + selector.length, end === -1 ? document.cookie.length : end);
            const request = await fetch('/get/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `JWT ${jwt}`,
                }
            });
            const response = await request.json();
            const data = response?.data?.data;
            if (data && response.success) {
                for(const todo of data) {
                    todo_counter += 1;
                    add_todo(todo_counter, todo.value, todo.tag_content, todo.starred, JSON.parse(todo.metadata), todo.checked, false);
                }
                modal.classList.add('hide');
                login.classList.add('hide');
                console.log('logged in successfully!');
            } else {
                trying_login.classList.add('hide');
                alert('Failed to login! You may not be connected to the internet. If you are, your cookies are possibly corrupted or your browser does not support the features this website requires. Please try logging in again, or continue locally.')
                deleteCookies();
            }
        } else {
            trying_login.classList.add('hide');
            alert('Failed to login! Your cookies are possibly corrupted or your browser does not support the features this website requires. Please try logging in again, or continue locally.')
            deleteCookies();
        }
    }
 
    form_login.addEventListener('click', async () => {
        console.log('attempting to login...');
        const result = await fetch('/login/', {
            method: 'POST',
            body: JSON.stringify({
                password: password.value,
                username: username.value,
            }),
        });
        const recieved = await result.json();
        jwt = recieved.jwt;
        if (recieved.invalid_password) {
            alert(`The username ${username.value} already exists / The password you entered was invalid!`);
            return;
        }

        if (recieved.success) {
            modal.classList.add('hide');
            login.classList.add('hide');
            logout.classList.remove('hide');
            const data = recieved?.data?.data;

            if (data) {
                for(const todo of data) {
                    todo_counter += 1;
                    add_todo(todo_counter, todo.value, todo.tag_content, todo.starred, JSON.parse(todo.metadata), todo.checked, false);
                }
            }

            if (jwt) {
                const now = Date.now();
                const six_hrs = new Date(now + 6 /* hours */ * 60 /* minutes */ * 60  /* seconds */ * 1000 /* milliseconds */);
                document.cookie = `${encodeURIComponent('jwt')}=${encodeURIComponent(jwt)};expires=${six_hrs.toGMTString()};secure;`
            }
            console.log('logged in successfully!');
        } else {
            alert('Failed to login! Check your connection and try again later, or continue locally.');
        }

        username.value = '';
        password.value = '';
    });

    no_login.addEventListener('click', () => {
        modal.classList.add('hide');
        logout.classList.add('hide');
        login.classList.remove('hide');
        jwt = null;
        restoreData();
    });

    logout.addEventListener('click', () => {
        deleteCookies();
        jwt = null;
        emptyTodos();
        trying_login.classList.add('hide');
        modal.classList.remove('hide');
    });

    login.addEventListener('click', () => {
        emptyTodos();
        modal.classList.remove('hide');
        trying_login.classList.add('hide');
    });

    todo_input.addEventListener('keypress', async (e) => {
        if (searching || !modal.classList.contains('hide')) return;

        if ((e.keyCode == 13 || e.key == 'Enter') && !edit_element) {
            todo_counter += 1;

            if (prev_input_txt) {
                tag.classList.remove('selected');
                add_todo(todo_counter, prev_input_txt, todo_input.value);
                prev_input_txt = null;
            } else add_todo(todo_counter, todo_input.value);

            todo_input.value = '';
        } else if ((e.keyCode == 13 || e.key == 'Enter') && edit_element) {
            const todo_text = edit_element.querySelector('.todo-text');
            todo_text.textContent = todo_input.value;
            const metadata = JSON.parse(edit_element.metadata || "{}");
            metadata.edit = Date.now();
            edit_element.metadata = JSON.stringify(metadata);
            if (prev_input_txt) {
                tag.classList.remove('selected');
                const tag_elem = document.createElement('div');

                tag_elem.classList.add('tag');
                tag_elem.textContent = todo_input.value;
                
                todo_text.textContent = prev_input_txt;

                edit_element.prepend(tag_elem);    
                prev_input_txt = null;
            }
            if (edit_element.classList.contains('starred')) {
                starred_todos.classList.add('show-section');
                if (other_todos.nextElementSibling?.classList.contains('todo'))
                    other_todos.classList.add('show-section');
                todo_list.insertBefore(edit_element, starred_todos.nextSibling)
            } else {
                if (starred_todos.classList.contains('show-section'))
                    other_todos.classList.add('show-section');
                todo_list.insertBefore(edit_element, other_todos.nextSibling)
            }

            todo_input.value = '';

            edit_element = null;
            await updateData();
        }
    });

    todo_input.addEventListener('input', () => {
        if (searching)
            for (element of todo_list.querySelectorAll('.todo')) {
                const split = todo_input.value.split(' ');
                let found = false;
                if (todo_input.value.trim() == '') found = true;
                const text = element.querySelector('.todo-label .todo-text').textContent;
                const tag = element.querySelector('.tag')?.textContent || '';
                for (chunk of split) {
                    if (chunk == '') continue;
                    if (text.toLowerCase().indexOf(chunk.toLowerCase()) != -1 || tag.toLowerCase().indexOf(chunk.toLowerCase()) != -1)
                        found = true;
                }
                if (found)
                    element.classList.remove('remove');
                else
                    element.classList.add('remove');
            }
    });

    tag.addEventListener('click', () => {
        if (!todo_input.value) return;
        prev_input_txt = todo_input.value;
        todo_input.value = '';
        tag.classList.add('selected');
        todo_input.focus();
    });

    search.addEventListener('click', () => {
        searching = !searching;
        if (!searching) {
            for (element of todo_list.querySelectorAll('.todo')) {
                element.classList.remove('remove');
            }
            search.classList.remove('selected');
        } else search.classList.add('selected');
        todo_input.focus();
    })

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key == 'z' && document.activeElement != todo_input && modal.classList.contains('hide')) {
            e.preventDefault();
            const popped = removed_elements.pop();
            if (popped) {
                if (popped.classList.contains('starred')) {
                    starred_todos.classList.add('show-section');
                    if (other_todos.nextElementSibling?.classList.contains('todo')) {
                        other_todos.classList.add('show-section');
                    }
                    todo_list.insertBefore(popped, starred_todos.nextSibling);
                } else {
                    if (starred_todos.classList.contains('show-section')) {
                        other_todos.classList.add('show-section');
                    }
                    todo_list.insertBefore(popped, other_todos.nextSibling);
                };
                updateData();
            }
            else
                alert('No more todos to restore');
        }
    });
};

const add_todo = async (index = 0, value = 'todo data', tag_content = null, starred = false, given_metadata = null, checked = false, update = true) => {
    const id = 'todo-' + index;
    const todo = document.createElement('div');
    todo.classList.add('todo');

    const metadata = given_metadata || {
        create: Date.now(),
        edit: null,
    };

    todo.metadata = JSON.stringify(metadata);

    todo.addEventListener('mouseenter', () => {
        const bounding_box = todo.getBoundingClientRect();
        tooltip.style.transform = `translateY(calc(${bounding_box.y}px - 2em)) translateX(calc(${bounding_box.x}px + 0.75em))`; 
        tooltip.style.opacity = '1';
        const metadata = JSON.parse(todo.metadata || "{}");
        const createDate = new Date(metadata.create);

        let data = null;

        if (metadata.edit) 
            data = `, Edited on ${showDate(new Date(metadata.edit))}`

        tooltip.textContent = 
            `Created on ${showDate(createDate)}${data ? data : '' }`;
        // setTimeout(() => tooltip.style.opacity = '0', 2000);
    });

    todo.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
    });

    if (starred) {
        starred_todos.classList.add('show-section');
        if (other_todos.nextElementSibling?.classList.contains('todo'))
            other_todos.classList.add('show-section');
        todo.classList.add('starred');
    }
    else if (starred_todos.classList.contains('show-section')) 
        other_todos.classList.add('show-section');

    if (tag_content) {
        const tag = document.createElement('div');

        tag.classList.add('tag');
        tag.textContent = tag_content;
    
        todo.appendChild(tag);    
    }

    const label = document.createElement('label');
    label.for = id;
    label.classList.add('todo-label');

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = checked;

    const check_if_checked = () => {
        if (input.checked) {
            label.classList.add('checked');
            todo.classList.add('checked');
        } else {
            label.classList.remove('checked');
            todo.classList.remove('checked');
        }
    };

    check_if_checked();

    input.addEventListener('input', async () => { await updateData(); check_if_checked(); });

    label.appendChild(input);
    const text = document.createElement('span');
    text.classList.add('todo-text');
    text.textContent = value;   
    label.appendChild(text);
    todo.appendChild(label);
    const edit = document.createElement('img');
    edit.src = '/static/edit.svg';
    const star = document.createElement('img');
    star.src = starred ? '/static/star_fill.svg' : '/static/star_stroke.svg';
    const delete_img = document.createElement('img');
    delete_img.src = '/static/delete.svg';

    delete_img.addEventListener('click', async () => {
        // hide tooltip
        tooltip.style.opacity = '0';

        // Arbitrary limit
        if (removed_elements.length < 8192)
            removed_elements.push(todo);
        todo.remove();
        if (starred_todos.nextElementSibling == other_todos) {
            starred_todos.classList.remove('show-section');
            other_todos.classList.remove('show-section');
        }
        if (!other_todos.nextElementSibling?.classList.contains('todo'))
            other_todos.classList.remove('show-section');
        await updateData();
    });

    edit.addEventListener('click', () => {
        // hide tooltip
        tooltip.style.opacity = '0';

        todo_input.focus();
        todo_input.value = text.textContent;
        edit_element = todo;
        todo.remove();
        if (starred_todos.nextElementSibling == other_todos) {
            starred_todos.classList.remove('show-section');
            other_todos.classList.remove('show-section');
        }
        if (!other_todos.nextElementSibling?.classList.contains('todo'))
            other_todos.classList.remove('show-section');
    });

    star.addEventListener('click', async () => {
        // hide tooltip
        tooltip.style.opacity = '0';

        todo.remove();
        if (!todo.classList.contains('starred')){
            starred_todos.classList.add('show-section');
            if (other_todos.nextElementSibling?.classList.contains('todo'))
                other_todos.classList.add('show-section');
            else 
                other_todos.classList.remove('show-section');
            star.src = '/static/star_fill.svg';
            todo_list.insertBefore(todo, starred_todos.nextSibling);
            todo.classList.add('starred');
        } else {
            todo.classList.remove('starred');
            star.src = '/static/star_stroke.svg';
            todo_list.insertBefore(todo, other_todos.nextSibling);
            other_todos.classList.add('show-section');
            if (starred_todos.nextElementSibling == other_todos) {
                starred_todos.classList.remove('show-section');
                other_todos.classList.remove('show-section');
            }
        }
        await updateData();
    });

    todo.appendChild(edit);
    todo.appendChild(star);
    todo.appendChild(delete_img);
    if (starred)
        todo_list.insertBefore(todo, starred_todos.nextSibling);
    else
        todo_list.insertBefore(todo, other_todos.nextSibling);

    if (update) await updateData();
}

const getMonthName = (number) => {
    switch (number + 1) {
        case 1: return "Jan";
        case 2: return "Feb";
        case 3: return "Mar";
        case 4: return "Apr";
        case 5: return "May";
        case 6: return "Jun";
        case 7: return "Jul";
        case 8: return "Aug";
        case 9: return "Sep";
        case 10: return "Oct";
        case 11: return "Nov";
        case 12: return "Dec";
        default: return "Unknown Month";
    }
}

const getDayName = (number) => {
    switch (number) {
        case 1: return "Mon";
        case 2: return "Tue";
        case 3: return "Wed";
        case 4: return "Thu";
        case 5: return "Fri";
        case 6: return "Sat";
        case 7: return "Sun";
        default: return "Unknown Day";
    }
}

const padZero = (number) => {
    if (number < 10) return '0' + number;
    else return number;
}

const showDate = (d) => 
    `${getDayName(d.getDay())}, ${getMonthName(d.getMonth())} ${d.getDate()}, ${d.getFullYear()} at time ${d.getHours()}:${padZero(d.getMinutes())}:${padZero(d.getSeconds())}`

const iDBreq = indexedDB.open('todo-store', 1);
let db = null;

iDBreq.onerror = (e) => {
    console.error('Error has occured in IndexedDB!', e);
}

iDBreq.onupgradeneeded = (e) => {
    db = e.target.result;
    console.log('Upgrade needed!');
    db.createObjectStore("todos", { autoIncrement: true });
}

iDBreq.onsuccess = (e) => {
    db = e.target.result;
    console.log("IndexedDB is running smoothly");
    // restoreData();
}

const updateData = async () => {
    try {
        const todos = document.querySelectorAll('.todo');
        const objStore = db.transaction(['todos'], 'readwrite').objectStore('todos');
        // Assuming this always works
        if (!jwt) objStore.clear();
        const data = [];
        for (const todo of todos) {
            const metadata = todo.metadata;
            const value = todo.querySelector('.todo-text')?.textContent;
            const tag_content = todo.querySelector('.tag')?.textContent;
            const starred = todo.classList.contains('starred');
            const checked = todo.querySelector('input')?.checked;
            if (jwt) {
                data.push({ metadata, value, tag_content, starred, checked });
            } else {
                const request = objStore.add({ metadata, value, tag_content, starred, checked });
                request.onerror = (e) => {
                    console.log('failed to update data. Error: ', e);
                }    
            }
        }
    
        if (jwt) {
            const request = await fetch('/upload/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `JWT ${jwt}`,
                },
                body: JSON.stringify({
                    data,
                })
            });
            const response = await request.json();
            if (!response.success) {
                console.error('Failed to upload the data!');
            }
        }
    } catch (e) {
        console.error('An error has occured while uploading data:', e);
    }
}

const restoreData = () => {
    if (!jwt) {
        const objStore = db.transaction(['todos'], 'readwrite').objectStore('todos');
        objStore.getAll().onsuccess = (e) => {
            const all = e.target.result;
            if (all) {
                for (const todo of all.reverse()) {
                    const { value, tag_content, metadata, starred, checked } = todo;
                    const parsed_metadata = JSON.parse(metadata || '{}');
                    todo_counter += 1;
                    add_todo(todo_counter, value, tag_content, starred, parsed_metadata, checked, false);    
                }
            }
        };    
    }
}

const emptyTodos = () => {
    // Is this the way?
    todo_list.textContent = '';

    const starred = document.createElement('div');
    starred.id = 'starred';
    starred.textContent = 'Starred Todos';
    const star = document.createElement('img');
    star.src = '/static/star_fill.svg';
    const other = document.createElement('div');
    other.id = 'other';
    other.textContent = 'Other Todos';

    starred.prepend(star);

    todo_list.appendChild(starred);
    todo_list.appendChild(other);

    starred_todos = starred;
    other_todos = other;
}

const deleteCookies = () => {
    // https://stackoverflow.com/a/27374365
    document.cookie
    .split(";")
    .forEach((cookie) => { 
        document.cookie = 
            cookie
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            }
        );
}

window.addEventListener('load', load);