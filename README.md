# Percy Sync

The project offers an easy to run a percy test suite in a synchronous manner. 


## How to install

```bash
npm i @maxmattone/percysync
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
export PERCY_READ_TOKEN=<your_write_token>
```

### Run the test suite

```bash
npx @maxmattone/percysync -t <max_percy_redering_time_in_seconds> -- <test_command>
```

Example for a mvn project:

```bash
npx @maxmattone/percysync -t 50 -- npx percy exex -- mvn test
```