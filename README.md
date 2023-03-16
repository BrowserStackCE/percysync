# Percy Sync

The project offers an easy to run a percy test suite in a synchronous manner. 

**_NOTE:_**  You should use a full access Percy token for this library to work. 

## How to install

```bash
npm i @maxmattone/percysync
```

## How to use

```bash
npx @maxmattone/percysync -t <max_percy_redering_time_in_seconds> -- <test_command>
```

Example for a mvn project:

```bash
npx @maxmattone/percysync -t 50 -- npx percy exex -- mvn test
```