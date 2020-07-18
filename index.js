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
        this.request_kinds = ["examples", "collocations"];
        this.paths = {
            "examples": "/skeget/xampl",
            "collocations": "/skeget/collx"
        };
        
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

SkeLexonomy.prototype.url_for_kind_index = function(kind_index) {
    if(kind_index < 0 || kind_index >= this.request_kinds.length) {
        throw "unknown index kind!";
    }
    
    let kind = this.request_kinds[kind_index];
    return this.paths[kind];
};

SkeLexonomy.prototype.default_parser_for_data = function(kind_index) {
    if(kind_index < 0 || kind_index >= this.request_kinds.length) {
        throw "unknown index kind!";
    }
    
    let kind = this.request_kinds[kind_index];
    return {
        0: _parse_example_data,
        1: _parse_collocation_data
    }[kind];
};

function _parse_example_data(data) {
    let response_data = [];
    for(let line of data.Lines) {
        let left = "";
        for(let left_el of line.Left) {
            left += left_el.str;
        }
        
        let right = "";
        for(let right_el of line.Right) {
            right += right_el.str;
        }
        
        let mid = "";
        for(let mid_el of line.Kwic) {
            mid += mid_el.str;
        }
    
        response_data.push({"left": left, "right": right, "mid": mid});
    }
    
    return response_data;
}

function _parse_collocation_data(line) {
    let response_data = []
    for (let item of line.Items) {
        response_data.push(item.cm);
    }
    return response_data;
}

SkeLexonomy.prototype.request = function(lemma, callback, url, kwargs) {
    let full_url = new URL(this.dict_url);
    full_url.pathname += url;
    
    // take advantage of fromp to get refs, page,...
    let additional_params = [];
    if ("additional_refs" in kwargs) {
        additional_params.push("refs=" + kwargs["additional_refs"])
    }
    if ("page_num" in kwargs) {
        additional_params.push("fromp=" + kwargs["page_num"])
    }
    if ("gdex" in kwargs) {
        additional_params.push("gdex_enabled=1")
        additional_params.push("gdexconf=" + kwargs["gdex"][0])
        additional_params.push("gdexcnt=" + kwargs["gdex"][1])
    }
    full_url.searchParams.set("fromp", additional_params.join("&"));
    
    full_url.searchParams.set("url", this.api_url)
    full_url.searchParams.set("corpus", this.corpus_name)
    full_url.searchParams.set("username", this.username)
    full_url.searchParams.set("apikey", this.api_key)
    
    // just setting both of these, no special logic, should work then all the time
    full_url.searchParams.set("query", lemma)
    full_url.searchParams.set("lemma", lemma)
    
    // TODO: this will be settable in later version
    full_url.searchParams.set("querytype", "skesimple")
    
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE) {
            if (this.status >= 200 && this.status < 400) {
                let response_json = JSON.parse(this.responseText);
                if("data_parser" in kwargs) {
                    response_json = kwargs["data_parser"](response_json);
                }
                callback(response_json);
            } 
            else {
                if ("error_callback" in kwargs) {
                    kwargs["error_callback"](this.status);
                }
            }
        }
    };
    xhr.open("GET", full_url.href, true);
    
    try {
        xhr.send();
    } 
    catch(e) {
        if ("error_callback" in kwargs) {
            console.log(e)
            kwargs["error_callback"](500);
        }
    }
}

module.exports = SkeLexonomy;
