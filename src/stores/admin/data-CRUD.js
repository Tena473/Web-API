import { defineStore } from 'pinia'
import axios from 'axios'
import { useEventStore } from '../event.js'

const primaryKeys = Object.freeze({
  data_admin: 'admin_id',
  data_student: 'student_id',
  data_payment: 'payment_id',
  data_product: 'product_id'
})

export const useAdminDataStore = defineStore('admin-data', {
  state: () => ({
    list: [],
    keys: [],
    get: [],
    loaded: false,
    recordsByResource: {},
  }),
  actions: {
    async loadData(localStoragekey, DBname) {
      // localStoragekey is retained temporarily for existing callers; data is
      // intentionally kept only in memory for the current authenticated user.
      this.list = []
      this.keys = []
      this.get = []
      this.loaded = false
      try {
        const res = await axios.get(`/api/get/${DBname}`)
        let arr = []
        if (localStoragekey == 'data-admin') {
          arr = Array.isArray(res.data) ? res.data : Object.values(res.data);
          if (arr[0].permissions) {
            arr.forEach(item => {
              if (typeof item.permissions === 'string') {
                item.permissions = JSON.parse(item.permissions || '[]')
              }
            })
          }
        } else {
          arr = res.data
        }
        this.recordsByResource[DBname] = Array.isArray(arr) ? arr : []
        this.list = arr || res.data;
        this.loaded = true;
        if (this.list.length > 0 && typeof this.list[0] === 'object' && this.list[0] !== null) {
          this.keys = Object.keys(this.list[0]);
        }
      } catch (err) {
        this.recordsByResource[DBname] = []
        this.list = []
        this.keys = []
        this.get = []
        this.loaded = false
        throw err
      }
    },

    recordsFor(DBname) {
      return this.recordsByResource[DBname] || []
    },

    clearSensitiveData() {
      this.$reset()
    },

    // async getDataList(DBname) {
    //   const res = await axios.get(`/api/get/${DBname}`)
    //   console.log(`Get Date from DATA ${DBname}`)
    // },

    async getData(index, localStoragekey, DBname) {
      if (!this.recordsFor(DBname).length) {
        await this.loadData(localStoragekey, DBname)
      }
      const records = this.recordsFor(DBname)
      return records[index]
    },

    async addData(Data, localStoragekey, DBname, isNew = true) {
      try {
        await axios.post(`/api/post/${DBname}`, Data)
        await this.loadData(localStoragekey, DBname)
        // console.log('Update data in localStorage', this.list)
        if (isNew) {
          useEventStore().popupMessage('success', 'add data success');
        }
      } catch (err) {
        useEventStore().popupMessage('error', 'add data failed');
      }
    },

    async updataData(index, Data, localStoragekey, DBname) {
      try {
        const records = this.recordsFor(DBname)
        const id = records[index]?.[primaryKeys[DBname]]
        // console.log("ID", id)
        // console.log("Data", Data)
        if (!id) throw new Error('Update id not found')
        await axios.put(`/api/put/${DBname}/${id}`, Data)
        // console.log(res.data)
        // for (let i = 0; i < this.keys.length; i++) {
        //   this.list[index][this.keys[i]] = Data[this.keys[i]]
        // }
        // localStorage.setItem(localStoragekey, JSON.stringify(this.list))
        await this.loadData(localStoragekey, DBname)
        useEventStore().popupMessage('success', 'update data success');
      } catch (err) {
        useEventStore().popupMessage('error', 'update data failed');
      }
    },

    async removeData(index, localStoragekey, DBname) {
      try {
        const records = this.recordsFor(DBname)
        const id = records[index]?.[primaryKeys[DBname]]
        if (!id) throw new Error('Data remove failed')
        await axios.delete(`/api/delete/${DBname}/${id}`)
        // this.list.splice(index, 1)
        // localStorage.setItem(localStoragekey, JSON.stringify(this.list))
        await this.loadData(localStoragekey, DBname)
        useEventStore().popupMessage('success', 'delete data success');
      } catch (err) {
        useEventStore().popupMessage('error', 'delete data failed');
      }
    }
  }
})
