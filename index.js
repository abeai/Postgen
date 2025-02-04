#!/usr/bin/env node

const fs = require('fs') // needed to read JSON file from disk
const Collection = require('postman-collection').Collection;
const beautify = require('beautify');

// Load a collection to memory from a JSON file on disk (say, sample-collection.json)
var collection = new Collection(JSON.parse(fs.readFileSync(process.argv[2]).toString())).toJSON();
var allNewClasses = [];

var parentName = ''


var jsFile = `
'use strict';

const fasq = require('@abeai/node-utils');
var hostUrl = '';
`


var parseHeader = function (body,header = [])
{
  var params = body.length > 0 ? ',' : '';
  for (var i = 0; i < header.length; i++)
  {
    if (header[i].key == 'Content-Type' && header[i].value == 'application/json')
    {
      params += 'json:true,'
    }
    else if (header[i].key == 'Authorization' && header[i].value == 'Bearer')
    {
      params += `authorization:{
        bearer: authorization_bearer
      },`
    }
    else if (header[i].key == 'Authorization' && header[i].value == 'Basic')
    {
      params += `authorization: {basic: {
        client: authorization_client,
        secret: authorization_secret
      }},`
    }
  }

  return params;
}

var parseUrl = function (url)
{
  for (var i = 0; i < url.path.length; i++)
  {
    if (url.path[i].indexOf(':') > -1)
    {
      url.path[i] = '${' + url.path[i].replace(':', '') + '}';
    }
  }

  var uri = url.path.join('/')
  var params = `uri: hostUrl+"/" + ` + '`' + uri + '`'
    url.query = url.query.filter(v=>v.key)
  if (url.query.length > 0)
  {
    params += ', qs: { '
    for (var i = 0; i < url.query.length; i++)
    {
      params += i + 1 < url.query.length ? url.query[i].key + ',' : url.query[i].key;
    }
    params += '}'
  }

  return params;
}

var getVars = function (url, body, headers = [])
{
  var vars = [];

  var urlVars = Array.from(url.variable.map(v => v.key.length > 0 ? v.key : null)).filter(v=>v);
  if(urlVars.length > 0) {
    vars = [...vars, ...urlVars];
  }

  var queryVars = (Object.keys(url.query).length > 0 ? Array.from(url.query.map(v => v.key.length > 0 ? v.key : null)): []).filter(v=>v);
  if(queryVars.length > 0) {
    vars = [...vars, ...queryVars];
  }

//console.log(urlVars, queryVars)

  var bodyString = '';
  if(body) {
    if(body.mode == 'raw') {
       bodyString = 'body'
    }
    else if(body.mode == 'urlencoded') {
      vars = [...(vars.length> 0 ? vars: []),...Array.from(body.urlencoded.map(v => v.key.length > 0 ? v.key : null)).filter(v=>v)];
    }
  }

  var varsString = bodyString.length > 0 && vars.length > 0 ? ','+vars.join() : vars.join();

  var headerString = '';
var headerVars = []
  if(headers.length > 0) {


    for (var i = 0; i < headers.length; i++)
    {
      if (headers[i].key == 'Authorization' && headers[i].value == 'Bearer')
      {
        headerVars.push(`authorization_bearer`)
      }
      else if (headers[i].key == 'Authorization' && headers[i].value == 'Basic')
      {
        headerVars.push('authorization_client');
        headerVars.push('authorization_secret');
      }
    }

    headerString +=  ((vars.length > 0 || bodyString.length > 0) && headerVars.length > 0 ? ',' : '') + headerVars.join();
  }

  return  bodyString + varsString + headerString +(vars.length > 0 || body || headerVars.length > 0 ? ',opts' : 'opts');
}

var getDocs = function (name, description, url, body, headers = [])
{
  var docs =
  `
/**
  * ${setMethodName(name)} - ${description}`

  var vars = [];

  var pathVars = Array.from(url.variable.map(v => v.key.length > 0 ? v.key : null)).filter(v=>v);
  var queryVars = (Object.keys(url.query).length > 0 ? Array.from(url.query.map(v => v.key.length > 0 ? v.key : null)): []).filter(v=>v);
  var urlVars = [];

//console.log(urlVars, queryVars)

  var bodyString = '';

  if(body) {
    if(body.mode == 'raw') {
       docs +=
  `
  * @param {Object} body`
  }
}

  var varsString = '';

for (var i = 0; i < url.variable.length; i++) {
  if(pathVars.indexOf(url.variable[i].key) > -1){
  docs +=
  `
  * @param {${url.variable[i].type || 'any'}} ${url.variable[i].key} ${url.variable[i].description ? url.variable[i].description.content : ''} ${url.variable[i].value? '(example: '+url.variable[i].value+')': ''}`
}
}
for (var i = 0; i < url.query.length; i++) {
  if(queryVars.indexOf(url.query[i].key) > -1){
  docs +=
  `
  * @param {${url.query[i].type || 'any'}} ${url.query[i].key} ${url.query[i].description ? url.query[i].description.content : ''} ${url.query[i].value? '(example: '+url.query[i].value+')': ''}`
  }
}
if(urlVars.length > 0) {
  if(urlVars.indexOf(body.urlencoded[i].key) > -1){
  for (var i = 0; i < body.urlencoded.length; i++) {
    docs +=
  `
  * @param {${body.urlencoded[i].type|| 'any'}} ${body.urlencoded[i].key} ${body.urlencoded[i].description ? body.urlencoded[i].description.content : ''} ${body.urlencoded[i].value? '(example: '+body.urlencoded[i].value+')': ''}`
  }
}

}

  if(headers.length > 0) {


    for (var i = 0; i < headers.length; i++)
    {
      if (headers[i].key == 'Authorization' && headers[i].value == 'Bearer')
      {
        docs +=
  `
  * @param {string} authorization_bearer ${headers[i].description.content}`
      }
      else if (headers[i].key == 'Authorization' && headers[i].value == 'Basic')
      {
        docs +=
  `
  * @param {string} authorization_client username/client_id
  * @param {string} authorization_secret password/client_secret`
      }
    }
  }



  if(body) {
    if(body.mode == 'raw') {
       docs +=
  `
  * @example
  * body
  * \`\`\`js
  * `
  docs += beautify(body.raw,{format: 'json'}).replace(/\n/g, '\n * ');
  docs += '\n  * ```';
    }
    else if(body.mode == 'urlencoded') {
      urlVars = Array.from(body.urlencoded.map(v => v.key.length > 0 ? v.key : null)).filter(v=>v);
    }
  }
  docs +=
  `
  */`
  //console.log(docs)
  return  docs;
}


//
var convertToOptions = function (request)
{
  var body = request.body;
  if(body) {
    if(body.mode == 'raw') {
       body = 'body'
    }
    else if(body.mode == 'urlencoded') {
      body = `form: {
        ${Array.from(request.body.urlencoded.map(v => v.key.length > 0 ? v.key : null)).filter(v=>v).join()}
      }`
    }
    else {
          body = ''
    }

  } else {
    body = ''
  }
  var options = `{
    method: '${request.method}', resolveWithFullResponse:true, simple: false, ${parseUrl(request.url)}, ${body} ${parseHeader(body || '',request.header)}
  }`;

  return options;
}


var setMethodName = function (n)
{
  var mn = '' + n
  return toCamel(mn.replace(/:/g, '').replace(/[ \/-]/g, '_').toLowerCase())
}

var setClassName = function (n, parent)
{
  var cn = (parent && parent != parentName ? parent+' ' : '') + n;
  var name = toCamel(cn.replace(/ /g, '_').toLowerCase());
  return name.charAt(0).toUpperCase() + name.slice(1);
}
const toCamel = (s) =>
{
  return s.replace(/([-_][a-z])/ig, ($1) =>
  {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

const isArray = function (a)
{
  return Array.isArray(a);
};

const isObject = function (o)
{
  return o === Object(o) && !isArray(o) && typeof o !== 'function';
};

const keysToCamel = function (o)
{
  if (isObject(o))
  {
    const n = {};

    Object.keys(o)
      .forEach((k) =>
      {
        n[toCamel(k)] = keysToCamel(o[k]);
      });

    return n;
  }
  else if (isArray(o))
  {
    return o.map((i) =>
    {
      return keysToCamel(i);
    });
  }

  return o;
};

var genClass = function (name, item, js, classObj, parent)
{

  var classEnd = false;
  allNewClasses.push(setClassName(name, parent));
  var newClasses = [];
  js += `
/**
  * ${classObj.description ? classObj.description.content.replace(/\n/g,
  `
  * `).replace(/\t/g,
  ` `) : ''}
 */
class ${setClassName(name, parent)} {
    constructor() {
    }
    `
  for (var i = item.length - 1; i >= 0; i--)
  {

    if (!item[i].item)
    {
      //console.log(item[i])
      js += `
          ${getDocs(item[i].name,item[i].request.description ? item[i].request.description.content : '', item[i].request.url, item[i].request.body, item[i].request.header || [])}
          static async ${setMethodName(item[i].name)}(${getVars(item[i].request.url, item[i].request.body, item[i].request.header || [])}) {
              var options = ${convertToOptions(item[i].request)};
              if(opts) {
                options = Object.assign(options, opts);
              }
              return await fasq.request(options)
          }
      `;
    }
    else
    {
      js += `
        static get ${setClassName(item[i].name)}() {
          return ${setClassName(item[i].name, name)};
        }
      `
      newClasses.push(item[i]);
    }
  }
  js += `}`

  for (var i = 0; i < newClasses.length; i++)
  {
    js += genClass(newClasses[i].name, newClasses[i].item, '', newClasses[i], name);
  }

  return js;

}

parentName = collection.info.name;

jsFile += genClass(collection.info.name, collection.item, '', collection.info)

jsFile += `
  module.exports= function(host){
    if(host) {
      hostUrl = host;
    }
    return {${allNewClasses.join()}};
  }
`

console.log(beautify(jsFile,
{
  format: 'js'
}));
