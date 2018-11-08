# leanix-utils
Currently contains the following LeanIX-helpers
* A __news-feed web page__ providing an overview on the recent changes within your workspace
* A __script to download__ a full Excel snapshot of a LeanIX workspace as well as the results of all survey runs

# Getting started
Clone the source files to your server or local IDE:

    git clone https://github.com/fnc-eam/leanix-utils.git

## Configuration of news feed
Go to the folder *news-feed* > *app*. Open the config.js file and add the following parameters:
* LeanIX instance URL of your company
* Workspace names
* API tokens (see [LeanIX documentation](https://dev.leanix.net/docs/authentication#section-generate-api-tokens) for creating tokens)

## Configuration of snapshot helper
Open the file config.ini and add the following parameters:
* API token of production workspace
* Workspace ID of production workspace
* LeanIX instance URL of your company
* __Optional__: Proxy information: Please set the parameter 'PROXY_REQUIRED' to True and add IP address and port number of the proxy
* __Optional__: Custom directory where download results should be stored

You need a Python installation (version 3.x, [download here](https://www.python.org/downloads/)) and the *requests* module (see [installation manual](http://docs.python-requests.org/en/master/user/install/#install)).

#Run LeanIX helpers
Make sure that the dedicated config file has been customized as described previously.

##How to use the news feed
In order to access the LeanIX API in a browser outside of leanix.net, we need to set up a few things:
* Option 1: Copy the news feed directory to a web server and ask the LeanIX Support Team to add a CORS whitelist entry for your server hostname.
* Option 2: Install a browser plugin that disables CORS checks (google: "CORS toggle" or "disable same origin policy")
* open 'index.html'

##How to use the download script
There are different ways how to run the script.

__Command Line__: Navigate to the *snapshot* directory. Run the following command

    python snapshot.py
    
__Local IDE__: Simply right click on the python script and select *run 'snapshot'*.

__Cron Job__: If you want to run the script repeatedly you should add it to a cron job (Linux/Unix).
