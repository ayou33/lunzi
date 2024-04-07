/**
 * File: fetch.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/7 15:58
 */
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import stateFetch from '../stateFetch'

axios.interceptors.request.use(config => {
  if (config.method === 'get') {
    config.params = {
      ...config.params,
      _t: Date.now(),
    }
  }
  
  if (config.method === 'post') {
    config.data = {
      ...config.data,
      _t: Date.now(),
    }
  }
  
  return config
})

const { send } = stateFetch()

function parseResp<T> (resp: AxiosResponse) {
  return resp.data as T
}

function receive (request: (config: AxiosRequestConfig) => Promise<AxiosResponse>) {
  return <T> (url: string, data?: Record<string, unknown>, config?: AxiosRequestConfig) => {
    return send(
      request,
      {
        ...config,
        url,
        data,
      },
    )
      .then(parseResp<T>)
  }
}

export const get = receive(config => {
  return axios({
    ...config,
    method: 'GET',
    params: config.data,
  })
})

export const post = receive(config => {
  return axios({
    ...config,
    method: 'POST',
  })
})
