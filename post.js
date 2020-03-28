exports.declare_trait = function(data){
    return {
        tag: 'declare_' + data[0][0].text,
        data: data,

        name: data[1],
    };
}

exports.declare_function = function(data){
    return {
        tag: 'declare_function',
        data: data,
        name: data[1].text,
    };
}

exports.expression_construct = function(data){
    return {
        tag: 'expression_construct',
        data: data,

        target: data[0],
        arguments: data[1],
    }
}

exports.declare_extension = function(data){
    return {
        tag: 'declare_extension',
        data: data,
        target: data[1],
    }
}

exports.expression_call = function(data){
    return {
        tag: 'expression_call',
        data: data,

        target: data[0],
        arguments: data[1],
    }
}

exports.whitespace = function(data){
    return {
        tag: 'whitespace',
        data: data,
    }
}

exports.type = function(data){
    return {
        tag: 'type',
        data: data,
    }
}

exports.parameter = function(name, type){
    return function(data){
        const obj = {
            tag: 'parameter',
            data: data,
        };

        if(name !== null){
            obj.name = data[name];
        }

        if(type !== null){
            obj.type = data[type];
        }

        return obj;
    };
}

exports.nth = function(n){
    return function(data){
        return data[n];
    }
}

function select(obj, ...keys){
    for (const key of keys) {
        obj = obj[key];

        if (obj === undefined || obj === null) {
            break;
        }
    }
    return obj;
};
exports.select = select;

exports.STAR = function(data){
    data = data[0];

    var all = [];
    if (data[2] !== null) {
        all.push(select(data, 2, 0));
        all = all.concat(...select(data, 2, 1));
    }

    return {
        tag: "$list",
        begin: select(data, 0),
        begin_ws: select(data, 1),
        elements: all.filter((_, i) => i % 2 == 0),
        separators: all.filter((_, i) => i % 2 == 1),
        all: all,
        end_ws: select(data, 2, 2),
        end: select(data, 3),
    }
}
