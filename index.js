'use strict';

// string formatting as per https://stackoverflow.com/a/4673436
// expanded to convert things like {{0}} to {0} and to use later
function string_format(format_string, ...args) {
    return format_string.replace(/{(\d+)}(?!})/g, function(match, number) { 
        return typeof args[number] != 'undefined' ? args[number] : match;
    }).replace("{{", "{").replace("}}", "}")
};

function SkeLexonomy() {
    // load settings from undocumented global variables, I hope this function is
    // the only magic in this library :)
    try {
        this.username = window.ske_username;
        this.api_key = window.ske_apiKey;
        this.corpus_name = window.kex.corpus;
        this.api_url = window.kex.apiurl;
        
        // we have everything global, now get local parameters
        let url = new URL(document.URL);
        this.dict_url = url.origin + "/" + url.pathname.split("/")[1]
        
        // static variables
        this.examples_path = "/skeget/xampl"
        
        
        // we were successfull, mark that :)
        this.initialized = true;
    } catch(err) {
        this.initialized = err;
    }
}

SkeLexonomy.prototype.check = function() {
    if(this.initialized === true) {
        return true;
    }
    else {
        return false;
    }
}


SkeLexonomy.prototype.get_examples = function(lemma, callback) {
    let url = new URL(this.dict_url);
    url.pathname += this.examples_path
    
    url.searchParams.set("url", this.api_url)
    url.searchParams.set("corpus", this.corpus_name)
    url.searchParams.set("username", this.username)
    url.searchParams.set("apikey", this.api_key)
    url.searchParams.set("query", lemma)
    
    // TODO: this will be settable in later version
    url.searchParams.set("querytype", "skesimple")
    
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE) {
            if (this.status >= 200 && this.status < 400) {
                let response_json = JSON.parse(this.responseText);
                let response_data = [];
                for(let line of response_json.Lines) {
                    let left = "";
                    for(let left_el of line.Left) {
                        left += left_el.str;
                    }
                        
                    let right = "";
                    for(let right_el of line.Right) {
                        right += right_el.str;
                    }
                    
                    response_data.push({"left": left, "right": right});
                }
                callback(response_data);
            } 
            else {
                // TODO...
                console.log(":(");
            }
        }
    };
    xhr.open("GET", url.href, true);
    xhr.send();
}

module.exports = SkeLexonomy;
