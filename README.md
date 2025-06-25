# Percy Sync

The project offers an easy to run a percy test suite in a synchronous manner. 


## How to install

```bash
npm i @browserstackce/percysync
```

## How to use

### Setup you percy token

#### Using a full access token

```bash
export PERCY_TOKEN=<your_token>
```

#### Using read only and write only access tokens

```bash
export PERCY_TOKEN=<your_write_token>
export PERCY_READ_TOKEN=<your_read_token>
```

### Run the test suite

```bash
npx @browserstackce/percysync -- <test_command>
```

Example for a mvn project:

```bash
npx @maxmattone/percysync -- npx percy exex -- mvn test
```
