import { createClient } from "jsr:@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";


const supabaseUrl = 'https://phoeycjzjksavxdhnmiz.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);


const key = await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"],);
  
const port = 8080;

async function registerUser(username: string, password: string) {
    const hashedPassword = bcrypt.hashSync(password);
    const { data, error } = await supabase
                                    .from('users')
                                    .insert([{ username, password: hashedPassword }]);
  
    if (error) {
        console.error('Error registering user:', error.message);
        return { success: false };
    }
  
    console.log(`User ${username} registered successfully!`);
    const jwt = await create({ alg: "HS256", typ: "JWT" }, { username }, key);

    return { success: true, data, jwt };
}

async function authenticateUser(username: string, password: string) {
    const { data: user, error } = await supabase
                                            .from('users')
                                            .select('username, password, data')
                                            .eq('username', username)
                                            .single();
  
    if (error) {
        console.error('Error fetching user:', error.message);
        return { success: false };
    }
  
    const valid = bcrypt.compareSync(password, user.password);
  
    if (!valid) {
        console.log(`The user ${username} has entered an invalid password`);
        return { success: false, invalid_password: true };
    }
  
    const jwt = await create({ alg: "HS256", typ: "JWT" }, { username }, key);

    console.log(`User ${username} authenticated successfully:`);
    return { success: true, data: { username: user.username, data: user.data }, jwt };
}
    
async function uploadData(username: string, updated_data: Object) {
    // Should probably encrypt the data, but eh.
    const { data, error } = await supabase
                                    .from('users')
                                    .update({ data: updated_data })
                                    .match({ username });

    if (error) {
        console.error('Error updating data:', error.message);
        return { success: false };
    }
    console.log(`success updating data of ${username}`);
    return { success: true, data };
}

async function getData(username: string) {
    const { data, error } = await supabase
                                    .from('users')
                                    .select('username, data')
                                    .eq('username', username)
                                    .single();

    if (error) {
        console.error('Error fetching data:', error.message);
        return { success: false };
    }
    console.log(`success fetching data of ${username}`);
    return { success: true, data };
}


const handler = async (request: Request, info: ServeHandlerInfo): Promise<Response> => {
    const url = new URL(request.url);
    if (url.pathname === '/') {
        const index = await Deno.open('./static/index.html');
        return new Response(index.readable, { headers: { 'Content-Type': 'text/html' }, status: 200 });
    } else if (url.pathname.startsWith('/static/')) {
        const file = await Deno.open('.' + url.pathname);
        
        console.log('opened file', url.pathname);

        if (url.pathname.endsWith('.css'))
            return new Response(file.readable, { headers: { 'Content-Type': 'text/css' }, status: 200 });
        else if (url.pathname.endsWith('.svg'))
            return new Response(file.readable, { headers: { 'Content-Type': 'image/svg+xml' }, status: 200 });
        else
            return new Response(file.readable, { headers: { 'Content-Type': 'text/plain' }, status: 200 });
    } else if (url.pathname.startsWith('/login/')) {
        const { password, username } = await request.json();
        console.log('attepting to auth', username);
        try {
            const result = await authenticateUser(username, password);

            if (result.invalid_password) {
                return new Response(JSON.stringify({ success: false, invalid_password: true, data: null, status: 200, jwt: null }));
            }

            if (!result.success) {
                const register = await registerUser(username, password);
                if (!register.success) {
                    return new Response(JSON.stringify({ success: false, data: null, status: 200, jwt: null }));
                }
                return new Response(JSON.stringify({ success: true, data: register.data, jwt: register.jwt, status: 200 }));
            }
            return new Response(JSON.stringify({ success: true, data: result.data, jwt: result.jwt, status: 200 }));
        } catch (e) {
            console.error(e);
            return new Response(JSON.stringify({ success: false, data: e, jwt: null, status: 200 }));
        }
    } else if (url.pathname.startsWith('/upload/')) {
        const { data } = await request.json();
        console.log('attempting to upload data');
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("JWT ")) {
            console.error('Missing / invalid jwt token sent');
            return new Response(JSON.stringify({ data: null, success: false, status: 400 }));
        }
        const jwt = authHeader.split(" ")[1]; 
        try {
            const { username } = await verify(jwt, key, "HS256");
            const response = await uploadData(username, data);    
            return new Response(JSON.stringify({ data: response.data, success: true, status: 200 }))
        } catch (error) {
            console.error("Error verifying token:", error);
            return new Response(JSON.stringify({ data: null, success: false, status: 400 }))
        } 
    } else if (url.pathname.startsWith('/get/')) {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("JWT ")) {
            console.error('Missing / invalid jwt token');
            return new Response(JSON.stringify({ data: null, success: false, status: 400 }));
        }
        const jwt = authHeader.split(" ")[1]; 
        try {
            const { username } = await verify(jwt, key, "HS256");
            const response = await getData(username);    
            return new Response(JSON.stringify({ data: response.data, success: true, status: 200 }))
        } catch (error) {
            console.error("Error verifying token:", error);
            return new Response(JSON.stringify({ data: null, success: false, status: 400 }))
        }
    }
    return new Response("404", { status: 404 });
};

await Deno.serve({ port }, handler);