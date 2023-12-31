# Pulumi Native Provider Boilerplate

This repository is a boilerplate showing how to create a native Pulumi provider.

### Background

This repository is part of the [guide for authoring and publishing a Pulumi Package](https://www.pulumi.com/docs/guides/pulumi-packages/how-to-author).

Learn about the concepts behind [Pulumi Packages](https://www.pulumi.com/docs/guides/pulumi-packages/#pulumi-packages).

Follow this link to see [an architecture diagram for Pulumi](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/#how-pulumi-works).

A Pulumi Resource Provider: 
- is a gRPC server which allows for the Pulumi engine to create resources in a specific cloud
- holds the lifecycle logic for these cloud resources
- holds a pulumi JSON schema that describes the provider
- provides language-specific SDKs so resources can be created in whichever language you prefer

When we speak of a "native" provider, we mean that all implementation is native to Pulumi, as opposed 
to [Terraform based providers](https://github.com/pulumi/pulumi-tf-provider-boilerplate).

## Authoring a Pulumi Native Provider

The following instructions assume that the provider is written for the Pulumi organisation.
In the future, we will add instruction for providers published and maintained by the Pulumi community, referred to as "third-party" providers.

This boilerplate creates a working Pulumi-owned provider named `xyz`.
It implements a random number generator that you can [build and test out for yourself](#test-against-the-example) and then replace the Random code with code specific to your provider.


### Prerequisites

Ensure the following tools are installed and present in your `$PATH`:

* [`pulumictl`](https://github.com/pulumi/pulumictl#installation)
* [Go 1.17](https://golang.org/dl/) or 1.latest
* [NodeJS](https://nodejs.org/en/) 14.x.  We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage NodeJS installations.
* [Yarn](https://yarnpkg.com/)
* [TypeScript](https://www.typescriptlang.org/)
* [Python](https://www.python.org/downloads/) (called as `python3`).  For recent versions of MacOS, the system-installed version is fine.
* [.NET](https://dotnet.microsoft.com/download)


### Creating and Initializing the Repository

Pulumi offers this repository as a [GitHub template repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template) for convenience.  From this repository:

1. Click "Use this template".
1. Set the following options:
   * Owner: pulumi 
   * Repository name: pulumi-xyz-native (replace "xyz" with the name of your provider)
   * Description: Pulumi provider for xyz
   * Repository type: Public
1. Clone the generated repository.

From the templated repository:

1. Search-replace `xyz` with the name of your desired provider.

#### Build the provider and install the plugin

   ```bash
   $ make build install
   ```
   
This will:

1. Create the SDK codegen binary and place it in a `./bin` folder (gitignored)
2. Create the provider binary and place it in the `./bin` folder (gitignored)
3. Generate the dotnet, Go, Node, and Python SDKs and place them in the `./sdk` folder
4. Install the provider on your machine.

#### Test against the example
   
```bash
$ cd examples/simple
$ yarn link @pulumi/vco
$ yarn install
$ pulumi stack init test
$ pulumi up
```

Now that you have completed all of the above steps, you have a working provider that generates a random string for you.

#### A brief repository overview

You now have:

1. A `provider/` folder containing the building and implementation logic
   1. `cmd/`
      1. `pulumi-gen-xyz/` - generates language SDKs from the schema
      2. `pulumi-resource-xyz/` - holds the package schema, injects the package version, and starts the gRPC server
   2. `pkg`
      1. `provider` - holds the gRPC methods (and for now, the sample implementation logic) required by the Pulumi engine
      2. `version` - semver package to be consumed by build processes
2. `deployment-templates` - a set of files to help you around deployment and publication
3. `sdk` - holds the generated code libraries created by `pulumi-gen-xyz/main.go`
4. `examples` a folder of Pulumi programs to try locally and/or use in CI.
5. A `Makefile` and this `README`.

### Writing the schema

The [JSON schema file](https://www.pulumi.com/docs/guides/pulumi-packages/schema) is used by `pulumi-gen-xyz` to create language-specific SDKs. 
It is, therefore, a central requirement for any resource provider.
Provider schemas can be handwritten, or alternatively machine-generated by combining API specification with pulumi-specific logic.

When writing the schema by hand, it is helpful to associate the JSON schema in your IDE for completion or Intellisense features to work:

* Visual Studio Code: the easiest option is to [map the schema file](https://code.visualstudio.com/Docs/languages/json#_mapping-in-the-user-settings)
  in your User Settings which enables it for all your provider projects:
  ```json
      "json.schemas": [
        {
            "fileMatch": [
                "/provider/cmd/pulumi-*/schema.json"
            ],
            "url": "https://raw.githubusercontent.com/pulumi/pulumi/master/pkg/codegen/schema/pulumi.json"
        }
    ]
  ```

This repository provides the [xyz example schema](./provider/cmd/pulumi-resource-xyz/schema.json) to get you started.  
[The AWS Native Provider schema](https://github.com/pulumi/pulumi-aws-native/blob/master/provider/cmd/pulumi-resource-aws-native/schema.json) provides a much larger example.  
Refer to the [package schema documentation](https://www.pulumi.com/docs/guides/pulumi-packages/schema/#pulumi-package-schema) for additional details when writing the schema.

### Implementing the gRPC methods

Once you have a schema that describes all the resources and metadata for your provider, you will need to implement the desired gRPC methods.
You will find a mostly blank implementation of these in `pkg/provider/provider.go`.
Note that these methods do not link 1:1 to the Pulumi CLI commands.

#### Basic Functionality

The struct and creation of the provider are implemented already:

```go
// provider/pkg/provider.go
type xyzProvider struct {
	host    *provider.HostClient
	name    string
	version string
	schema  []byte
}

func makeProvider(host *provider.HostClient, name, version string, pulumiSchema []byte) (pulumirpc.ResourceProviderServer, error) {
   // Return the new provider
   return &xyzProvider{
   host:    host,
   name:    name,
   version: version,
   schema:  pulumiSchema,
   }, nil
}
```

You need to provide the following methods:

1. Check - validates resource Inputs
2. Diff - calculates the differences between the actual and the desired state of a resource
3. Create - creates a new instance of a resource from an Input
4. Update - updates a resource in-place (i.e. without deleting/recreating)
5. Read - reads current inputs and state for a resource
6. Delete - deletes a resource and its corresponding state

[Resource lifecycle methods are documented here](https://pulumi-developer-docs.readthedocs.io/en/stable/providers/implementers-guide.html#custom-resource-lifecycle).

The following methods are necessary for every provider and are already implemented:

1. GetPluginInfo - returns generic information about this plugin, like its version
2. GetSchema - returns the Pulumi schema to the provider


#### Additional Methods

The [resource provider service](https://github.com/pulumi/pulumi/blob/master/sdk/proto/provider.proto) includes a few more gRPC methods that you may need to implement and can read more about.

### Build Examples

Create an example program using the resources defined in your provider, and place it in the `examples/` folder.

You can now repeat the steps for [build, install, and test](#test-against-the-example).


## Documentation

Please [follow this guide to add documentation to your provider](https://www.pulumi.com/docs/guides/pulumi-packages/how-to-author/#write-documentation).

## Configuring CI and releases

1. Follow the instructions laid out in the [deployment templates](./deployment-templates/README-DEPLOYMENT.md).

## References

Other resources for learning about the Pulumi resource model:
* [Pulumi Kubernetes provider](https://github.com/pulumi/pulumi-kubernetes/blob/master/provider/pkg/provider/provider.go)
* [Pulumi Terraform Remote State provider](https://github.com/pulumi/pulumi-terraform/blob/master/provider/cmd/pulumi-resource-terraform/provider.go)
* [Dynamic Providers](https://www.pulumi.com/docs/intro/concepts/programming-model/#dynamicproviders)
